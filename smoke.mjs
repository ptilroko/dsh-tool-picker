import { apply, inject } from './index.js';

const registered = [];
const layers = [];
const guards = [];
const events = [];
const agent = {
  id: 'session-1',
  session: { header: { cwd: 'E:\\Documents\\deepseek-harness\\default-workspace' } },
  ctx: {
    tools: {
      restrict(filter) {
        layers.push(filter);
        return () => layers.pop();
      },
      guard(fn) {
        guards.push(fn);
        return () => guards.pop();
      },
    },
  },
};

const ctx = {
  provide: (name, value) => registered.push([name, value]),
  on: (name, fn) => (events.push([name, fn]), () => {}),
  agents: {
    get: (id) => (id === 'session-1' ? agent : undefined),
    list: () => [agent],
  },
  tools: {
    view: () => ({
      visible: new Map([['bash', { description: 'Run a shell command inside the session workspace.' }], ['read', { description: 'Read a UTF-8 file and return line-numbered content.' }]]),
      knownNames: new Set(['bash', 'read', 'run_code', 'pwsh']),
      restrictableNames: new Set(['bash', 'read', 'run_code', 'pwsh']),
    }),
  },
  inject: (names, cb) => cb({ commands: { register: (def) => registered.push(['command', def]) } }),
  sessions: { list: () => [...all.values()].map((entry) => ({ id: entry.id })) },
  get: (name) => {
    if (name === 'sessionController') {
      return {
        async list() {
          return {
            items: [
              { sessionId: 'session-1', updatedAt: 20, projections: { kind: 'sequenced', values: { title: '接插件开发', sessionListMetadata: { blank: false } } } },
              { sessionId: 'session-3', updatedAt: 10, projections: { kind: 'cached', values: { title: null } } },
              { sessionId: 'session-4', updatedAt: 30, projections: { kind: 'cached', values: { title: '旧对话' } } },
            ],
          };
        },
      };
    }
    if (name === 'workspaceRegistry') return { archivedSessionIds: ['session-4'] };
    return undefined;
  },
};

console.log('INJECT', inject);
apply(ctx);
const [, picker] = registered.find(([name]) => name === 'toolPicker');
const [, command] = registered.find(([name]) => name === 'command');
console.log('BOARD', JSON.stringify(picker.state('session-1')));
console.log('TOGGLE', JSON.stringify(picker.setEnabled('session-1', 'bash', false)));
console.log('LAYERS', JSON.stringify(layers));

console.log('GUEST ON', JSON.stringify(picker.setGuest('session-1', true)));
console.log('LAYERS AFTER GUEST', JSON.stringify(layers));
const guard = guards[guards.length - 1];
const probe = (name, args) => JSON.stringify(guard({ name, arguments: args }) ?? 'allowed');
console.log('guard read inside   ', probe('read', { file_path: 'notes.txt' }));
console.log('guard read nested   ', probe('read', { file_path: 'sub/dir/notes.txt' }));
console.log('guard read relative ', probe('read', { file_path: '../secret.txt' }));
console.log('guard read absolute ', probe('read', { file_path: 'C:\\Windows\\win.ini' }));
console.log('guard glob ok       ', probe('glob', { pattern: '**/*.js' }));
console.log('guard glob escape   ', probe('glob', { pattern: '../**/*.js' }));
console.log('guard grep path     ', probe('grep', { pattern: 'secret', path: 'E:\\Users' }));
console.log('guard bash (restrict covers it)', probe('bash', { command: 'type C:\\Windows\\win.ini' }));

// --- coverage: no field-name whitelist any more ---------------------------------
console.log('guard unknown field ', probe('notebook_edit', { notebook_path: 'C:\\Windows\\a.json' }));
console.log('guard nested object ', probe('multi_edit', { edits: [{ file_path: '../escape.txt', old_string: '' }] }));
console.log('guard array of paths', probe('read', { paths: ['notes.txt', 'D:\\secret.txt'] }));
console.log('guard prose allowed ', probe('write', { file_path: 'notes.md', content: 'see C:\\Windows\\win.ini and ../escape.txt' }));
console.log('guard url allowed   ', probe('fetch', { url: 'https://example.com/a/b' }));

console.log('CMD list', JSON.stringify(command.handler({ agent, rawInput: '' })));
console.log('CMD off', JSON.stringify(command.handler({ agent, rawInput: 'off read' })));
console.log('CMD guest off', JSON.stringify(command.handler({ agent, rawInput: 'guest off' })));
console.log('CMD save', JSON.stringify(command.handler({ agent, rawInput: 'save 访客' })));
console.log('CMD templates', JSON.stringify(command.handler({ agent, rawInput: 'templates' })));
console.log('TEMPLATES', JSON.stringify(picker.templates()));
console.log('EXPORT', JSON.stringify(picker.exportTemplates()));
console.log('IMPORT', JSON.stringify(picker.importTemplates('{"templates":{"极简":{"tools":["bash"],"guest":true}}}')));
console.log('APPLY', JSON.stringify(picker.applyTemplate('session-1', '极简')));
console.log('LAYERS AFTER APPLY', JSON.stringify(layers), 'GUARDS', guards.length);
console.log('DELETE', JSON.stringify(picker.deleteTemplate('访客')));
console.log(
  'BAD IMPORT',
  JSON.stringify(
    (() => {
      try {
        return picker.importTemplates('not json');
      } catch (error) {
        return String(error.message);
      }
    })(),
  ),
);
console.log('CMD reset', JSON.stringify(command.handler({ agent, rawInput: 'reset' })));
console.log('LAYERS AFTER RESET', JSON.stringify(layers), 'GUARDS', guards.length);

// --- new-conversation defaults -------------------------------------------------
console.log('DEFAULTS', JSON.stringify(picker.defaults()));
console.log('CMD default on', JSON.stringify(command.handler({ agent, rawInput: 'default on' })));
console.log('DEFAULTS AFTER', JSON.stringify(picker.defaults()));
console.log('SESSION-1 UNTOUCHED', JSON.stringify(picker.state('session-1').guest));

const all = new Map([[agent.id, agent]]);
ctx.agents.get = (id) => all.get(id);
ctx.agents.list = () => [...all.values()];
const created = events.find(([name]) => name === 'agent/created')[1];

// an older conversation resumed while the default is on must stay as it was
const old = { id: 'session-3', session: agent.session, ctx: agent.ctx };
all.set(old.id, old);
created({ agent: old, source: 'resume' });
console.log('OLD RESUMED', JSON.stringify(picker.state('session-3').guest));

const fresh = { id: 'session-9', session: agent.session, ctx: agent.ctx };
all.set(fresh.id, fresh);
created({ agent: fresh, source: 'startup' });
console.log('FRESH SESSION', JSON.stringify(picker.state('session-9')));

console.log('CMD default off', JSON.stringify(command.handler({ agent, rawInput: 'default off' })));
const later = { id: 'session-10', session: agent.session, ctx: agent.ctx };
all.set(later.id, later);
created({ agent: later, source: 'startup' });
console.log('LATER SESSION (default off)', JSON.stringify(picker.state('session-10').guest));

// --- settings page feed ---------------------------------------------------------
const feed = await picker.sessions();
console.log('SESSIONS DEFAULTS', JSON.stringify(feed.defaults));
console.log('SESSIONS ROWS', JSON.stringify(feed.sessions));
const closed = await picker.setGuest('session-3', true);
console.log('CLOSED SESSION GUEST', JSON.stringify(closed));
console.log('SESSIONS AFTER', JSON.stringify((await picker.sessions()).sessions.map((row) => [row.id, row.title, row.guest, row.live])));

// --- the log outranks the profile file ------------------------------------------
// A conversation reopened on a machine without a record: the request header it logged
// says only `read` survived, so the picker rebuilds the rest as switched off.
const resumed = {
  id: 'session-77',
  session: {
    header: { cwd: 'E:\\Documents\\deepseek-harness\\default-workspace' },
    requestHeader: () => ({ tools: [{ name: 'read' }] }),
  },
  ctx: agent.ctx,
};
all.set(resumed.id, resumed);
created({ agent: resumed, source: 'resume' });
console.log('RESTORED FROM LOG', JSON.stringify(picker.state('session-77')));

// A fresh conversation with no recorded request falls back to the defaults.
const brandNew = { id: 'session-78', session: { header: { cwd: 'E:\\Documents\\deepseek-harness\\default-workspace' }, requestHeader: () => undefined }, ctx: agent.ctx };
all.set(brandNew.id, brandNew);
created({ agent: brandNew, source: 'startup' });
console.log('BRAND NEW', JSON.stringify(picker.state('session-78')));

// --- a layer that refuses to apply is reported, not swallowed --------------------
const brokenRegistered = [];
const brokenAgent = {
  id: 'session-2',
  session: { header: { cwd: 'E:\\Documents\\deepseek-harness\\default-workspace' } },
  ctx: {
    tools: {
      restrict() {
        throw new Error('tools.restrict() requires a scoped context');
      },
      guard() {
        return () => {};
      },
    },
  },
};
const brokenCtx = {
  provide: (name, value) => brokenRegistered.push([name, value]),
  on: () => () => {},
  agents: { get: () => brokenAgent, list: () => [brokenAgent] },
  tools: ctx.tools,
  inject: () => {},
  get: () => undefined,
};
apply(brokenCtx);
const [, brokenPicker] = brokenRegistered.find(([name]) => name === 'toolPicker');
brokenPicker.setEnabled('session-2', 'bash', false);
console.log('DEGRADED', JSON.stringify(brokenPicker.state('session-2').degraded));
