/**
 * Per-session tool picker.
 *
 * The session log stays the only source of truth for what the model saw: this plugin
 * never appends events. It records, per live session, which *inherited* tools the user
 * switched off, and materialises that choice as a `ctx.tools.restrict()` layer on that
 * agent's own context — the mechanism the harness documents for hiding one agent's
 * tools (`tools.schemas()` / `tools.get()` / execution all agree with it).
 *
 * Guest mode adds a second, narrower layer: the shell tools stay off, and a
 * `tools.guard()` rejects every filesystem call whose path resolves outside the
 * session workspace. The harness sandbox itself only governs *modifications*
 * (`read-only` means "cannot modify"), so reads need this guard to stay local.
 *
 * The bundle deliberately imports no runtime package: it is installed as a `link:`
 * dependency, so a bare `@deepseek-ai/...` specifier would resolve from this directory
 * (which has no `node_modules`) and fail. The Remote surface is therefore hand-written:
 * a service registered with `ctx.provide()`, a `typertRemote` binding, and the prototype
 * marker the gateway's source fallback reads.
 */
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';

const REMOTE_METHODS = '@deepseek-ai/dsh-typert-protocol/remote-methods';

/** Tools the harness owns itself; `tools.restrict()` refuses to name them. */
const RESERVED = new Set(['run_code']);

/**
 * Tools that can reach outside the workspace by other means than a path argument: guest
 * mode switches them off. Sub-agents are included because a child agent would not inherit
 * this session's guard.
 */
const GUEST_BLOCKED = ['bash', 'pwsh', 'shell', 'terminal', 'exec', 'subagent', 'workflow'];

/**
 * Argument fields that hold prose, not a location. They are skipped so that a document
 * *mentioning* `C:\Windows\win.ini` can still be written inside the workspace.
 */
const CONTENT_FIELDS = new Set([
  'content',
  'text',
  'prompt',
  'message',
  'body',
  'old_string',
  'new_string',
  'old_source',
  'new_source',
  'replacement',
  'patch',
  'diff',
  'description',
  'instructions',
  'query',
  'command',
  'script',
  'code',
]);

function profileDirectory() {
  if (process.env.DSH_PROFILE_DIR) return process.env.DSH_PROFILE_DIR;
  const name = process.env.DSH_PROFILE || 'desktop';
  return join(homedir(), '.dsh', 'profiles', name);
}

/** Normalise one stored entry into a clean list of tool names. */
function namesOf(value) {
  const raw = Array.isArray(value) ? value : Array.isArray(value?.disabled) ? value.disabled : Array.isArray(value?.tools) ? value.tools : [];
  return raw.filter((name) => typeof name === 'string' && name.length > 0);
}

/** Normalise one stored entry into the full record shape (version 1 and 2 stay readable). */
function recordOf(value) {
  if (value === null || typeof value !== 'object') return { disabled: namesOf(value), guest: false };
  return { disabled: namesOf(value), guest: value.guest === true };
}

/**
 * Durable, best-effort per-session selection plus reusable templates.
 * A missing or broken file means "all tools on".
 */
class SelectionStore {
  constructor() {
    this.file = join(profileDirectory(), 'data', 'dsh-tool-picker', 'state.json');
    this.sessions = Object.create(null);
    this.templates = Object.create(null);
    this.defaults = { disabled: [], guest: false };
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8'));
      for (const [id, value] of Object.entries(parsed?.sessions ?? {})) {
        const record = recordOf(value);
        if (record.disabled.length > 0 || record.guest) this.sessions[id] = record;
      }
      for (const [name, value] of Object.entries(parsed?.templates ?? {})) {
        if (typeof name === 'string' && name.length > 0) this.templates[name] = recordOf(value);
      }
      if (parsed?.defaults !== undefined) this.defaults = recordOf(parsed.defaults);
    } catch {
      /* no state yet, or unreadable: every session starts with all tools enabled */
    }
  }

  /**
   * The record of one session. A session without one has every tool enabled and no
   * guest mode: the defaults are COPIED into a conversation when it starts, never
   * inherited on read, so switching the default can never reach back into older
   * conversations.
   */
  recordOf(sessionId) {
    const record = this.sessions[sessionId];
    if (record === undefined) return { disabled: [], guest: false };
    return { disabled: [...record.disabled], guest: record.guest === true };
  }

  hasRecord(sessionId) {
    return this.sessions[sessionId] !== undefined;
  }

  setRecord(sessionId, record) {
    this.sessions[sessionId] = { disabled: [...record.disabled], guest: record.guest === true };
    this.persist();
  }

  clearRecord(sessionId) {
    delete this.sessions[sessionId];
    this.persist();
  }

  setDefaults(record) {
    this.defaults = { disabled: [...record.disabled], guest: record.guest === true };
    this.persist();
  }

  /** Every session id this profile has an explicit record for. */
  sessionIds() {
    return Object.keys(this.sessions);
  }

  templatesOf() {
    return Object.keys(this.templates)
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({ name, tools: [...this.templates[name].disabled], guest: this.templates[name].guest === true }));
  }

  saveTemplate(name, record) {
    this.templates[name] = { disabled: [...record.disabled], guest: record.guest === true };
    this.persist();
  }

  deleteTemplate(name) {
    delete this.templates[name];
    this.persist();
  }

  mergeTemplates(entries) {
    let imported = 0;
    for (const [name, value] of entries) {
      if (typeof name !== 'string' || name.trim().length === 0) continue;
      this.templates[name.trim()] = recordOf(value);
      imported += 1;
    }
    if (imported > 0) this.persist();
    return imported;
  }

  persist() {
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      const payload = { version: 4, defaults: this.defaults, sessions: this.sessions, templates: this.templates };
      writeFileSync(this.file, `${JSON.stringify(payload, null, 2)}\n`);
    } catch (error) {
      console.warn(`[dsh-tool-picker] cannot persist selection: ${String(error)}`);
    }
  }
}

/** The absolute workspace root a session's relative paths resolve against. */
function workspaceOf(agent) {
  const cwd = agent?.session?.header?.cwd ?? agent?.session?.cwd;
  return typeof cwd === 'string' && cwd.length > 0 ? resolve(cwd) : resolve(process.cwd());
}

function inside(root, candidate) {
  const fold = (value) => (process.platform === 'win32' ? value.toLowerCase() : value);
  const base = fold(root.endsWith(sep) ? root.slice(0, -1) : root);
  const path = fold(candidate);
  return path === base || path.startsWith(`${base}${sep}`);
}

/**
 * The real location of `target`, following junctions and symlinks. A path that does not
 * exist yet resolves through its nearest existing ancestor plus the missing tail, which is
 * what a create would actually open.
 */
function realPathOf(target) {
  let current = resolve(target);
  const missing = [];
  for (let depth = 0; depth < 64; depth += 1) {
    try {
      return resolve(join(realpathSync.native(current), ...[...missing].reverse()));
    } catch {
      const parent = dirname(current);
      if (parent === current) return resolve(target);
      missing.push(basename(current));
      current = parent;
    }
  }
  return resolve(target);
}

/** Cheap shape test: does this string look like a filesystem location at all? */
function looksLikePath(value) {
  if (value.length === 0 || value.length > 400) return false;
  if (/[\r\n]/.test(value)) return false;
  if (isAbsolute(value)) return true;
  if (/[\\/]/.test(value)) return true;
  return value === '.' || value === '..';
}

/**
 * Reject one candidate path when it leaves the workspace, lexically or through a link.
 * Returns a message suitable for the model, or undefined when the path is fine.
 */
function escapeReason(name, raw, root, realRoot) {
  const target = isAbsolute(raw) ? resolve(raw) : resolve(root, raw);
  if (inside(root, target) && inside(realRoot, realPathOf(target))) return undefined;
  return `访客模式：${name} 不能访问工作区之外的路径 "${raw}"（工作区：${root}）`;
}

/**
 * Walk every argument of one call and collect the first path that escapes. No field name
 * list is trusted here: any string that *looks* like a path is checked, so a filesystem
 * tool from another plugin (`notebook_path`, `target_file`, …) cannot slip through, while
 * prose fields (a document that mentions `C:\…`) stay untouched.
 */
function firstEscape(exec, root, realRoot) {
  const walk = (value, key, depth) => {
    if (depth > 6 || value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      if (key !== undefined && CONTENT_FIELDS.has(key)) return undefined;
      if (!looksLikePath(value)) return undefined;
      return escapeReason(exec.name, value, root, realRoot);
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const reason = walk(item, key, depth + 1);
        if (reason !== undefined) return reason;
      }
      return undefined;
    }
    if (typeof value === 'object') {
      for (const [field, item] of Object.entries(value)) {
        if (CONTENT_FIELDS.has(field)) continue;
        const reason = walk(item, field, depth + 1);
        if (reason !== undefined) return reason;
      }
    }
    return undefined;
  };
  return walk(exec.arguments ?? {}, undefined, 0);
}

/**
 * A path guard for guest mode: deny any call whose argument resolves outside the session
 * workspace. Relative paths resolve the same way the tools resolve them, and every
 * argument is checked twice — lexically, and again on its real location, so a junction or
 * symlink planted inside the workspace cannot forward the call outward.
 *
 * `onBlock` receives the refusal so the picker can show that guest mode did something.
 */
function guestGuard(root, onBlock) {
  const realRoot = realPathOf(root);
  return (exec) => {
    const reason = firstEscape(exec, root, realRoot);
    if (reason !== undefined && typeof onBlock === 'function') {
      try {
        onBlock(reason);
      } catch {
        /* reporting must never break the refusal itself */
      }
    }
    return reason;
  };
}

export const inject = ['tools', 'agents'];

export function apply(ctx) {
  const store = new SelectionStore();
  /** session id -> disposers of that agent's own restriction and guard layers */
  const layers = new Map();
  /** session id -> what could not be applied, so the UI can stop claiming it worked */
  const degraded = new Map();
  /** session id -> { count, last } of guest-mode refusals */
  const refusals = new Map();

  function noteRefusal(sessionId, reason) {
    const current = refusals.get(sessionId) ?? { count: 0, last: '' };
    refusals.set(sessionId, { count: current.count + 1, last: reason });
  }

  /**
   * The tool names the model last actually saw in this session, read from the folded
   * request header the harness writes into the log. That makes the log — not this plugin's
   * JSON — the authority on which tools are switched off: a transcript copied to another
   * machine still carries the removals.
   */
  function loggedToolNames(agent) {
    try {
      const header = agent?.session?.requestHeader?.();
      const tools = header?.tools;
      if (!Array.isArray(tools)) return undefined;
      return new Set(tools.map((tool) => tool?.name).filter((name) => typeof name === 'string' && name.length > 0));
    } catch {
      return undefined;
    }
  }

  function live(sessionId) {
    if (typeof sessionId !== 'string' || sessionId.length === 0) throw new Error('sessionId must be a non-empty string');
    let agent;
    try {
      agent = ctx.agents.get(sessionId);
    } catch {
      agent = undefined;
    }
    return agent;
  }

  function board(sessionId, agent) {
    const view = ctx.tools.view(agent);
    const record = store.recordOf(sessionId);
    const off = new Set(record.disabled);
    const tools = [...view.restrictableNames]
      .filter((name) => !RESERVED.has(name))
      .sort()
      .map((name) => ({ name, enabled: view.visible.has(name) && !off.has(name) }));
    const refusal = refusals.get(sessionId);
    return {
      sessionId,
      live: true,
      guest: record.guest,
      tools,
      enabledCount: tools.filter((tool) => tool.enabled).length,
      blocked: refusal?.count ?? 0,
      lastBlocked: refusal?.last ?? '',
      degraded: [...(degraded.get(sessionId) ?? [])],
    };
  }

  function dispose(agentId) {
    const previous = layers.get(agentId);
    layers.delete(agentId);
    if (previous === undefined) return;
    for (const disposer of previous) {
      try {
        disposer();
      } catch {
        /* the agent context may already be torn down */
      }
    }
  }

  function materialise(agent) {
    dispose(agent.id);
    degraded.delete(agent.id);

    const problems = [];
    const view = ctx.tools.view(agent);
    const record = store.recordOf(agent.id);
    const deny = new Set(record.disabled.filter((name) => !RESERVED.has(name) && view.restrictableNames.has(name)));
    if (record.guest) {
      for (const name of GUEST_BLOCKED) {
        if (!RESERVED.has(name) && view.restrictableNames.has(name)) deny.add(name);
      }
    }

    const disposers = [];
    if (deny.size > 0) {
      try {
        disposers.push(agent.ctx.tools.restrict({ deny: [...deny] }));
      } catch (error) {
        console.warn(`[dsh-tool-picker] cannot restrict session ${agent.id}: ${String(error)}`);
        problems.push(`工具受限未生效：${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (record.guest) {
      try {
        disposers.push(agent.ctx.tools.guard(guestGuard(workspaceOf(agent), (reason) => noteRefusal(agent.id, reason))));
      } catch (error) {
        console.warn(`[dsh-tool-picker] cannot guard session ${agent.id}: ${String(error)}`);
        problems.push(`路径守卫未生效：${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (disposers.length > 0) layers.set(agent.id, disposers);
    if (problems.length > 0) degraded.set(agent.id, problems);
  }

  class ToolPicker {
    /** Read the switch board for one session. */
    state(sessionId) {
      const agent = live(sessionId);
      if (agent === undefined) {
        return { sessionId, live: false, guest: false, tools: [], enabledCount: 0, blocked: 0, lastBlocked: '', degraded: [] };
      }
      return board(sessionId, agent);
    }

    /** Switch one tool on or off for exactly one session and answer with the new board. */
    setEnabled(sessionId, toolName, enabled) {
      const agent = live(sessionId);
      if (agent === undefined) throw new Error(`session ${sessionId} is not open`);
      if (typeof toolName !== 'string' || toolName.length === 0) throw new Error('toolName must be a non-empty string');
      if (RESERVED.has(toolName)) throw new Error(`"${toolName}" is owned by the harness and cannot be switched off`);

      const view = ctx.tools.view(agent);
      if (!view.restrictableNames.has(toolName)) throw new Error(`unknown tool "${toolName}" for this session`);

      const record = store.recordOf(sessionId);
      const disabled = new Set(record.disabled);
      if (enabled === true) disabled.delete(toolName);
      else disabled.add(toolName);
      store.setRecord(sessionId, { disabled: [...disabled], guest: record.guest });
      materialise(agent);
      return board(sessionId, agent);
    }

    /** Turn guest mode on or off: workspace-only paths, and no shell. Works for closed sessions too. */
    setGuest(sessionId, enabled) {
      if (typeof sessionId !== 'string' || sessionId.length === 0) throw new Error('sessionId must be a non-empty string');
      const record = store.recordOf(sessionId);
      store.setRecord(sessionId, { disabled: record.disabled, guest: enabled === true });
      const agent = live(sessionId);
      if (agent === undefined) return { sessionId, live: false, guest: enabled === true, tools: [], enabledCount: 0 };
      materialise(agent);
      return board(sessionId, agent);
    }

    /** Every conversation this profile knows about, with its guest-mode state. */
    async sessions() {
      const rows = new Map();
      const remember = (id, title, updatedAt, blank = false) => {
        const current = rows.get(id);
        if (current !== undefined) {
          if (current.title.length === 0 && title.length > 0) current.title = title;
          if ((current.updatedAt ?? 0) < (updatedAt ?? 0)) current.updatedAt = updatedAt ?? 0;
          current.blank = current.blank && blank !== false;
          return;
        }
        rows.set(id, {
          id,
          title,
          guest: store.recordOf(id).guest,
          live: false,
          blank: blank === true,
          child: false,
          updatedAt: updatedAt ?? 0,
        });
      };

      // A session summary carries no `title` field: the name lives in the folded `title`
      // projection (dsh-session-title registers key "title" with a string state), so read it
      // from the projection block first and only then from the legacy summary field.
      const titleOf = (item) => {
        const folded = item?.projections?.values?.title;
        if (typeof folded === 'string' && folded.length > 0) return folded;
        if (typeof item?.title === 'string' && item.title.length > 0) return item.title;
        return '';
      };

      const rememberChild = (id) => {
        const row = rows.get(id);
        if (row !== undefined) row.child = true;
      };

      const controller = ctx.get?.('sessionController');
      if (controller !== undefined && typeof controller.list === 'function') {
        try {
          const listed = await controller.list({});
          for (const item of listed?.items ?? []) {
            const id = item?.sessionId ?? item?.id;
            if (typeof id !== 'string' || id.length === 0) continue;
            const blank = item?.blank === true || item?.projections?.values?.sessionListMetadata?.blank === true;
            remember(id, titleOf(item), item.updatedAt ?? item.createdAt, blank);
            if (item?.parentSessionId !== undefined) rememberChild(id);
          }
        } catch (error) {
          console.warn(`[dsh-tool-picker] cannot list stored sessions: ${String(error)}`);
        }
      }

      // `sessions` is not an injected service here; the agent registry already knows every
      // conversation that is open right now, and each agent carries its live session.
      const titles = ctx.get?.('sessionTitle');
      const liveIds = new Set();
      for (const agent of ctx.agents.list()) {
        const session = agent?.session;
        if (session === undefined) continue;
        liveIds.add(agent.id);
        let title = '';
        try {
          const snapshot = titles?.get?.(session);
          if (typeof snapshot?.title === 'string') title = snapshot.title;
          else if (typeof snapshot === 'string') title = snapshot;
        } catch {
          /* a session without an eligible first message has no title yet */
        }
        remember(agent.id, title, 0);
      }
      for (const id of store.sessionIds()) remember(id, '', 0);

      // Archived conversations are hidden by default: they are out of the way in the sidebar
      // too, and nobody switches guest mode for a conversation they filed away.
      const archived = new Set();
      // Only sessions a workspace actually owns belong in this list: `sessionController.list`
      // also returns conversations from other directories (and subagent children), which the
      // sidebar never shows.
      const owned = new Set();
      try {
        const registry = ctx.get?.('workspaceRegistry');
        for (const id of registry?.archivedSessionIds ?? []) archived.add(id);
        for (const workspace of registry?.list?.() ?? []) {
          for (const id of workspace?.sessionIds ?? []) owned.add(id);
        }
      } catch {
        /* no workspace registry: nothing is archived and every row is eligible */
      }

      return {
        defaults: { guest: store.defaults.guest === true },
        sessions: [...rows.values()]
          .map((row) => ({ ...row, live: liveIds.has(row.id), archived: archived.has(row.id) }))
          .filter(
            (row) =>
              row.child !== true &&
              (row.live ||
                row.guest ||
                // a row without a workspace is usually a leftover record from an old profile run:
                // keep it only when it carries a real name
                (row.title.length > 0 && (owned.size === 0 || owned.has(row.id)))),
          )
          .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0) || left.id.localeCompare(right.id)),
      };
    }

    /** Every saved template, sorted by name. */
    templates() {
      return { templates: store.templatesOf() };
    }

    /** Whether brand-new sessions start in guest mode. */
    defaults() {
      return { guest: store.defaults.guest === true };
    }

    /** Defaults for conversations that start from now on (open ones are untouched). */
    setDefaultGuest(enabled) {
      store.setDefaults({ disabled: store.defaults.disabled, guest: enabled === true });
      return { guest: enabled === true };
    }

    /** Freeze the current switches (and guest mode) of one session as a named template. */
    saveTemplate(sessionId, name) {
      const agent = live(sessionId);
      if (agent === undefined) throw new Error(`session ${sessionId} is not open`);
      const label = typeof name === 'string' ? name.trim() : '';
      if (label.length === 0) throw new Error('template name must not be empty');
      if (label.length > 60) throw new Error('template name must be at most 60 characters');

      const view = ctx.tools.view(agent);
      const record = store.recordOf(sessionId);
      const disabled = record.disabled.filter((tool) => !RESERVED.has(tool) && view.restrictableNames.has(tool));
      store.saveTemplate(label, { disabled, guest: record.guest });
      return { templates: store.templatesOf() };
    }

    /** Replace one session's switches with a template and answer with the new board. */
    applyTemplate(sessionId, name) {
      const agent = live(sessionId);
      if (agent === undefined) throw new Error(`session ${sessionId} is not open`);
      const template = store.templatesOf().find((entry) => entry.name === name);
      if (template === undefined) throw new Error(`unknown template "${String(name)}"`);

      const view = ctx.tools.view(agent);
      store.setRecord(sessionId, {
        disabled: template.tools.filter((tool) => !RESERVED.has(tool) && view.restrictableNames.has(tool)),
        guest: template.guest,
      });
      materialise(agent);
      return board(sessionId, agent);
    }

    deleteTemplate(name) {
      store.deleteTemplate(name);
      return { templates: store.templatesOf() };
    }

    /** Portable payload for the clipboard or a file: `{ version: 2, templates: { name: { tools, guest } } }`. */
    exportTemplates() {
      const templates = Object.create(null);
      for (const entry of store.templatesOf()) templates[entry.name] = { tools: entry.tools, guest: entry.guest };
      return { version: 2, templates };
    }

    /** Merge an exported payload back in; unknown shapes are rejected, names collide by overwrite. */
    importTemplates(payload) {
      let parsed = payload;
      if (typeof payload === 'string') {
        try {
          parsed = JSON.parse(payload);
        } catch (error) {
          throw new Error(`cannot parse template JSON: ${String(error instanceof Error ? error.message : error)}`);
        }
      }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('template payload must be an object');
      const source = parsed.templates ?? parsed.presets ?? parsed;
      if (source === null || typeof source !== 'object' || Array.isArray(source)) throw new Error('template payload has no templates object');
      const imported = store.mergeTemplates(Object.entries(source));
      if (imported === 0) throw new Error('template payload contains no usable template');
      return { templates: store.templatesOf(), imported };
    }
  }

  /**
   * A generated Remote declares its methods with a decorator; a hand-written bundle marks
   * the same prototype constant so the gateway's source fallback finds them.
   */
  Object.defineProperty(ToolPicker.prototype, REMOTE_METHODS, {
    configurable: true,
    value: Object.freeze({
      version: 1,
      methods: Object.freeze(
        [
          'state',
          'setEnabled',
          'setGuest',
          'sessions',
          'defaults',
          'setDefaultGuest',
          'templates',
          'saveTemplate',
          'applyTemplate',
          'deleteTemplate',
          'exportTemplates',
          'importTemplates',
        ].map((method) => ({ method, invocation: Object.freeze({ kind: 'direct' }) })),
      ),
    }),
  });

  const picker = new ToolPicker();
  picker.typertRemote = Object.freeze({ service: picker, serviceKey: 'toolPicker', namespace: 'toolPicker' });

  ctx.provide('toolPicker', picker);

  ctx.inject(['commands'], (commandCtx) => {
    commandCtx.commands.register({
      definitionId: 'dsh-tool-picker',
      name: 'tools',
      description: '列出、关闭或打开本会话可调用的工具（只影响当前会话）',
      input: { hint: '[on|off|guest|default|reset] [tool]' },
      handler: ({ agent, rawInput }) => {
        const sessionId = agent.id;
        const [verb, ...rest] = String(rawInput ?? '').trim().split(/\s+/).filter(Boolean);
        const name = rest.join(' ');
        const current = () => {
          const now = ctx.agents.get(sessionId);
          if (now === undefined) return { sessionId, live: false, guest: false, tools: [], enabledCount: 0 };
          return board(sessionId, now);
        };
        const describe = (result) => {
          if (result.live !== true) return `会话 ${sessionId} 已不在运行`;
          const off = result.tools.filter((tool) => !tool.enabled).map((tool) => tool.name);
          const head = `本会话工具 ${result.enabledCount}/${result.tools.length} 已启用`;
          const guest = result.guest ? '（访客模式：仅工作区）' : '';
          const blocked = result.blocked > 0 ? `；已拦截 ${result.blocked} 次越界访问` : '';
          const broken = result.degraded.length > 0 ? `；注意：${result.degraded.join('；')}` : '';
          const body = off.length === 0 ? `${head}${guest}，没有关闭的工具` : `${head}${guest}；已关闭：${off.join(', ')}`;
          return `${body}${blocked}${broken}`;
        };

        try {
          if (verb === undefined) return { kind: 'success', text: describe(current()) };
          if (verb === 'reset') {
            store.clearRecord(sessionId);
            const now = ctx.agents.get(sessionId);
            if (now !== undefined) materialise(now);
            return { kind: 'success', text: `已恢复本会话的全部工具。${describe(current())}` };
          }
          if (verb === 'default') {
            const next = name === 'off' ? false : name === 'on' ? true : !store.defaults.guest;
            picker.setDefaultGuest(next);
            return {
              kind: 'success',
              text: `${next ? '已让新对话默认开启访客模式' : '新对话不再默认开启访客模式'}（当前会话不受影响）`,
            };
          }
          if (verb === 'guest') {
            const record = store.recordOf(sessionId);
            const next = name === 'off' ? false : name === 'on' ? true : !record.guest;
            picker.setGuest(sessionId, next);
            return { kind: 'success', text: `${next ? '已开启访客模式：文件操作仅限本工作区，shell 与子代理已关闭' : '已关闭访客模式'}。${describe(current())}` };
          }
          if (verb === 'templates') {
            const list = store.templatesOf();
            return {
              kind: 'success',
              text:
                list.length === 0
                  ? '还没有模板'
                  : list.map((entry) => `${entry.name}(${entry.tools.length}${entry.guest ? '+访客' : ''})`).join('、'),
            };
          }
          if (verb === 'save' || verb === 'apply' || verb === 'delete') {
            if (name.length === 0) return { kind: 'error', text: `用法：/tools ${verb} <模板名>` };
            if (verb === 'save') picker.saveTemplate(sessionId, name);
            else if (verb === 'apply') picker.applyTemplate(sessionId, name);
            else picker.deleteTemplate(name);
            const head = verb === 'save' ? '已保存模板' : verb === 'apply' ? '已套用模板' : '已删除模板';
            return { kind: 'success', text: `${head}「${name}」。${describe(current())}` };
          }
          if (verb !== 'on' && verb !== 'off') {
            return {
              kind: 'error',
              text: '用法：/tools、/tools off|on <工具名>、/tools guest [on|off]、/tools default [on|off]、/tools reset、/tools templates、/tools save|apply|delete <模板名>',
            };
          }
          if (name.length === 0) return { kind: 'error', text: `用法：/tools ${verb} <工具名>` };
          const enabled = verb === 'on';
          for (const toolName of name.split(/[,，]/).map((part) => part.trim()).filter(Boolean)) {
            picker.setEnabled(sessionId, toolName, enabled);
          }
          return { kind: 'success', text: describe(current()) };
        } catch (error) {
          return { kind: 'error', text: String(error instanceof Error ? error.message : error) };
        }
      },
    });
  });

  /**
   * Rebuild one session's switches from its own log. The harness writes a `request/header`
   * event whenever the request envelope changes and a `developer/message` recording the
   * tool additions/removals that produced it, so "the tools that were missing" is durable
   * and travels with the transcript.
   */
  function restoreFromLog(agent) {
    const seen = loggedToolNames(agent);
    // No `request/header` in the log at all: this conversation has never asked the model
    // anything, so it is new and the defaults apply. Every other case is restored from what
    // the log says the model saw — including "nothing was restricted".
    if (seen === undefined) return false;
    const view = ctx.tools.view(agent);
    const missing = [...view.restrictableNames].filter((name) => !RESERVED.has(name) && !seen.has(name));
    // Guest mode itself is a plugin preference, not a log record; infer it when every shell
    // and sub-agent tool is gone while the file tools stayed, which is its exact footprint.
    const shellish = GUEST_BLOCKED.filter((name) => view.restrictableNames.has(name));
    const guest = shellish.length > 0 && shellish.every((name) => missing.includes(name));
    store.setRecord(agent.id, { disabled: missing, guest });
    return true;
  }

  ctx.on('agent/created', ({ agent, source }) => {
    if (!store.hasRecord(agent.id)) {
      // The log outranks both the profile file and the defaults: a conversation that is
      // reopened (or forked, or copied from another machine) is restored from what it
      // itself recorded. Only a conversation with no recorded request at all is new.
      if (!restoreFromLog(agent) && source === 'startup') {
        // A conversation that starts now COPIES the defaults as its own record, once.
        // Nothing is inherited on read, so changing the default later cannot touch it.
        store.setRecord(agent.id, { disabled: store.defaults.disabled, guest: store.defaults.guest });
      }
    }
    materialise(agent);
  });
  ctx.on('agent/disposed', ({ agent }) => dispose(agent.id));
  for (const agent of ctx.agents.list()) materialise(agent);
}
