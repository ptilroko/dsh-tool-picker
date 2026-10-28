window.__ModuleLoader__.load({
  id: '@local/dsh-tool-picker',
  factory: (require) => {
    const React = require('react');
    const h = React.createElement;

    const NS = 'dsh-tool-picker';
    const PACKAGE = '@local/dsh-tool-picker';

    /** Zod is only used for the descriptor's introspection schema; the call path never parses. */
    let zod;
    try {
      const required = require('zod');
      zod = required.z ?? required;
    } catch {
      zod = undefined;
    }
    const anySchema = () => (zod === undefined ? undefined : zod.any());
    const stringSchema = () => (zod === undefined ? undefined : zod.string());
    const booleanSchema = () => (zod === undefined ? undefined : zod.boolean());

    const stringCodec = {
      mode: 'strict',
      typeSymbol: '@local/dsh-tool-picker#string',
      create: stringSchema,
      jsonSchema: { type: 'string' },
    };
    const booleanCodec = {
      mode: 'strict',
      typeSymbol: '@local/dsh-tool-picker#boolean',
      create: booleanSchema,
      jsonSchema: { type: 'boolean' },
    };
    const stateResult = {
      mode: 'src-json',
      typeSymbol: '@local/dsh-tool-picker#ToolBoard',
      create: anySchema,
      description: 'the current switch board of one session',
      jsonSchema: { type: 'object' },
    };
    const templatesResult = {
      mode: 'src-json',
      typeSymbol: '@local/dsh-tool-picker#Templates',
      create: anySchema,
      description: 'the saved templates and, for imports, how many were merged',
      jsonSchema: { type: 'object' },
    };

    const zh = {
      trigger: '工具',
      triggerHint: '选择本会话可以调用的工具',
      title: '本会话工具',
      subtitle: '只影响当前会话，模型看不到被关掉的工具',
      close: '完成',
      loading: '读取中…',
      empty: '没有可切换的工具',
      failed: '读取工具列表失败',
      on: '启用',
      off: '已关闭',
      search: '搜索工具…',
      noMatch: '没有匹配的工具',
      templates: '模板',
      back: '返回',
      namePlaceholder: '新模板名…',
      save: '保存当前',
      apply: '套用',
      remove: '删除',
      exportLabel: '导出',
      importLabel: '导入',
      emptyTemplates: '还没有模板',
      templateFailed: '模板操作失败',
      saved: '已保存',
      imported: '已导入',
      guest: '访客模式',
      guestHint: '文件操作仅限本工作区；shell、子代理自动关闭',
      defaultGuest: '新对话默认开启',
      defaultGuestHint: '新建会话自动带访客模式；现有会话不受影响',
      switchOn: '已开启',
      switchOff: '已关闭',
      settingsFailed: '读取设置失败',
      sectionTitle: '访客模式',
      sectionIntro: '开启后，该会话的文件操作只能落在自己的工作区内，shell 与子代理自动关闭。切换立刻生效，不需要重启。',
      sessionsTitle: '按会话设置',
      refresh: '刷新',
      liveBadge: '当前打开',
      unnamedSession: '未命名会话',
      emptySessions: '还没有任何会话',
    };
    const en = {
      trigger: 'Tools',
      triggerHint: 'Choose the tools this session may call',
      title: 'Session tools',
      subtitle: 'Applies to this session only; the model cannot see a disabled tool',
      close: 'Done',
      loading: 'Loading…',
      empty: 'No switchable tools',
      failed: 'Could not read the tool list',
      on: 'Enabled',
      off: 'Off',
      search: 'Search tools…',
      noMatch: 'No matching tool',
      templates: 'Templates',
      back: 'Back',
      namePlaceholder: 'New template name…',
      save: 'Save current',
      apply: 'Apply',
      remove: 'Delete',
      exportLabel: 'Export',
      importLabel: 'Import',
      emptyTemplates: 'No templates yet',
      templateFailed: 'Template action failed',
      saved: 'Saved',
      imported: 'Imported',
      guest: 'Guest mode',
      guestHint: 'File access stays inside this workspace; shell and sub-agents are off',
      defaultGuest: 'New chats default on',
      defaultGuestHint: 'Fresh sessions start in guest mode; existing ones keep their own state',
      switchOn: 'On',
      switchOff: 'Off',
      settingsFailed: 'Could not read the setting',
      sectionTitle: 'Guest mode',
      sectionIntro:
        'With guest mode on, that conversation can only touch files inside its own workspace, and shell plus sub-agents are switched off. Changes apply immediately.',
      sessionsTitle: 'Per conversation',
      refresh: 'Refresh',
      liveBadge: 'Open now',
      unnamedSession: 'Untitled conversation',
      emptySessions: 'No conversations yet',
    };

    const styles = {
      trigger: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        height: '28px',
        padding: '0 8px',
        borderRadius: 'var(--dsw-radius-sm)',
        border: 'none',
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        font: 'inherit',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        lineHeight: '20px',
      },
      badge: {
        minWidth: '16px',
        height: '16px',
        padding: '0 4px',
        borderRadius: '8px',
        background: 'var(--dsw-alias-state-business-primary, #3b82f6)',
        color: '#fff',
        fontSize: '10px',
        fontWeight: 600,
        lineHeight: '16px',
        textAlign: 'center',
      },
      backdrop: { position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' },
      panel: (position) => ({
        position: 'fixed',
        left: `${Math.max(8, Math.min(position.left, window.innerWidth - 320))}px`,
        bottom: `${Math.max(8, position.bottom)}px`,
        zIndex: 9999,
        width: '300px',
        maxHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px',
        borderRadius: 'var(--dsw-radius-md, 10px)',
        background: 'var(--dsw-alias-bg-module-platform, #fff)',
        boxShadow: '0 12px 32px rgba(0,0,0,.18)',
        border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))',
        color: 'var(--dsw-alias-label-primary, #111)',
        fontSize: '13px',
      }),
      headerTitle: { fontSize: '13px', fontWeight: 600, lineHeight: '20px' },
      headerHint: {
        fontSize: '11px',
        lineHeight: '16px',
        color: 'var(--dsw-alias-label-tertiary, #888)',
        marginTop: '2px',
      },
      list: { marginTop: '8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' },
      row: (enabled) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '6px 8px',
        border: 'none',
        borderRadius: 'var(--dsw-radius-sm, 6px)',
        background: 'transparent',
        color: enabled ? 'var(--dsw-alias-label-primary, #111)' : 'var(--dsw-alias-label-tertiary, #888)',
        font: 'inherit',
        fontSize: '13px',
        cursor: 'pointer',
        textAlign: 'left',
      }),
      check: (enabled) => ({
        flex: 'none',
        width: '16px',
        height: '16px',
        borderRadius: '4px',
        border: `1px solid ${enabled ? 'var(--dsw-alias-state-business-primary, #3b82f6)' : 'var(--dsw-alias-border-l2, #bbb)'}`,
        background: enabled ? 'var(--dsw-alias-state-business-primary, #3b82f6)' : 'transparent',
        color: '#fff',
        fontSize: '11px',
        lineHeight: '14px',
        textAlign: 'center',
      }),
      name: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      footer: {
        marginTop: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      },
      note: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary, #888)' },
      done: {
        border: 'none',
        borderRadius: 'var(--dsw-radius-sm, 6px)',
        background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.14))',
        color: 'var(--dsw-alias-label-primary, #111)',
        font: 'inherit',
        fontSize: '12px',
        padding: '4px 10px',
        cursor: 'pointer',
      },
      error: {
        marginTop: '8px',
        padding: '6px 8px',
        borderRadius: 'var(--dsw-radius-sm, 6px)',
        background: 'var(--dsw-alias-bg-l2, rgba(255,0,0,.08))',
        color: 'var(--dsw-alias-state-error-primary, #d33)',
        fontSize: '12px',
        lineHeight: '16px',
        wordBreak: 'break-word',
      },
      empty: {
        padding: '8px',
        fontSize: '12px',
        color: 'var(--dsw-alias-label-tertiary, #888)',
      },
      search: {
        marginTop: '8px',
        width: '100%',
        boxSizing: 'border-box',
        padding: '5px 8px',
        border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.25))',
        borderRadius: 'var(--dsw-radius-sm, 6px)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary, #111)',
        font: 'inherit',
        fontSize: '12px',
        outline: 'none',
      },
      link: {
        border: 'none',
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary, #555)',
        font: 'inherit',
        fontSize: '12px',
        padding: '2px 4px',
        cursor: 'pointer',
      },
      rowActions: { display: 'flex', alignItems: 'center', gap: '2px', flex: 'none' },
      templateRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 8px',
        borderRadius: 'var(--dsw-radius-sm, 6px)',
        fontSize: '12px',
      },
      templateName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      count: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary, #888)' },
      guestRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        boxSizing: 'border-box',
        marginTop: '8px',
        padding: '6px 8px',
        border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.25))',
        borderRadius: 'var(--dsw-radius-sm, 6px)',
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        fontSize: '12px',
        cursor: 'pointer',
        textAlign: 'left',
      },
      guestText: { display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, minWidth: 0 },
      guestSub: { fontSize: '11px', lineHeight: '15px', color: 'var(--dsw-alias-label-tertiary, #888)' },
      settingsRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px 0',
        borderBottom: '0.5px solid var(--dsw-alias-border-l3, rgba(127,127,127,.2))',
      },
      settingsText: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 },
      settingsTitle: { fontSize: '14px', lineHeight: '20px', color: 'var(--dsw-alias-label-primary, inherit)' },
      settingsDesc: { fontSize: '12px', lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary, #888)' },
      switchButton: {
        flex: 'none',
        minWidth: '64px',
        height: '28px',
        padding: '0 10px',
        borderRadius: 'var(--dsw-radius-sm, 6px)',
        border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.25))',
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        fontSize: '12px',
        cursor: 'pointer',
      },
      section: { display: 'flex', flexDirection: 'column', width: '100%', padding: '4px 0 24px' },
      sectionTitle: { fontSize: '18px', lineHeight: '24px', fontWeight: 600, color: 'var(--dsw-alias-label-primary, inherit)' },
      sectionDesc: { fontSize: '13px', lineHeight: '20px', marginTop: '6px', color: 'var(--dsw-alias-label-secondary, #aaa)' },
      sectionFailure: {
        marginTop: '10px',
        padding: '8px 10px',
        borderRadius: 'var(--dsw-radius-sm, 6px)',
        background: 'rgba(220,80,80,.12)',
        color: 'var(--dsw-alias-state-error-label, #d9534f)',
        fontSize: '12px',
        lineHeight: '18px',
      },
      sectionHint: { padding: '12px 0', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #888)' },
      listHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '18px',
        paddingBottom: '4px',
      },
      linkButton: {
        border: 'none',
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary, #aaa)',
        font: 'inherit',
        fontSize: '12px',
        cursor: 'pointer',
        padding: 0,
      },
      sessionName: {
        fontSize: '14px',
        lineHeight: '20px',
        color: 'var(--dsw-alias-label-primary, inherit)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    };

    /**
     * The settings page that owns guest mode for every conversation. It replaced the two
     * per-conversation entry points on purpose: "which conversations are in guest mode"
     * is one question that deserves one screen, not one popover opened N times.
     */
    function GuestSettingsSection({ api, t }) {
      const [data, setData] = React.useState(undefined);
      const [failure, setFailure] = React.useState(undefined);
      const [busy, setBusy] = React.useState(undefined);

      const read = React.useCallback(() => {
        let live = true;
        api.call('sessions', []).then(
          (value) => {
            if (!live) return;
            setData(value);
            setFailure(undefined);
          },
          (error) => {
            if (live) setFailure(`${t('settingsFailed')}: ${error instanceof Error ? error.message : String(error)}`);
          },
        );
        return () => {
          live = false;
        };
      }, [api, t]);

      React.useEffect(read, [read]);

      const setDefault = (next) => {
        setBusy('default');
        api
          .call('setDefaultGuest', [next])
          .then(
            (value) => {
              setData((current) => ({ ...current, defaults: { guest: value.guest === true } }));
              setFailure(undefined);
            },
            (error) => setFailure(`${t('settingsFailed')}: ${error instanceof Error ? error.message : String(error)}`),
          )
          .finally(() => setBusy(undefined));
      };

      const setGuest = (sessionId, next) => {
        setBusy(sessionId);
        api
          .call('setGuest', [sessionId, next])
          .then(
            () => {
              setData((current) =>
                current === undefined
                  ? current
                  : {
                      ...current,
                      sessions: current.sessions.map((row) => (row.id === sessionId ? { ...row, guest: next } : row)),
                    },
              );
              setFailure(undefined);
            },
            (error) => setFailure(`${t('settingsFailed')}: ${error instanceof Error ? error.message : String(error)}`),
          )
          .finally(() => setBusy(undefined));
      };

      // Conversations that were never used have no title and no record: they would only add
      // noise, so the list keeps named ones, open ones, and any session already switched on.
      // Archived conversations stay hidden — the sidebar files them away for a reason.
      const rows = (data?.sessions ?? []).filter(
        (row) =>
          row.archived !== true &&
          ((typeof row.title === 'string' && row.title.length > 0) || row.live === true || row.guest === true),
      );
      const defaultOn = data?.defaults?.guest === true;
      const shortId = (id) => (typeof id === 'string' && id.length > 12 ? `${id.slice(0, 8)}…` : String(id ?? ''));

      return h(
        'div',
        { style: styles.section },
        h('div', { style: styles.sectionTitle }, t('sectionTitle')),
        h('div', { style: styles.sectionDesc }, t('sectionIntro')),
        failure === undefined ? null : h('div', { style: styles.sectionFailure }, failure),
        h(
          'div',
          { style: styles.settingsRow },
          h(
            'div',
            { style: styles.settingsText },
            h('div', { style: styles.settingsTitle }, t('defaultGuest')),
            h('div', { style: styles.settingsDesc }, t('defaultGuestHint')),
          ),
          h(
            'button',
            {
              type: 'button',
              disabled: busy !== undefined || data === undefined,
              onClick: () => setDefault(!defaultOn),
              style: styles.switchButton,
            },
            defaultOn ? t('switchOn') : t('switchOff'),
          ),
        ),
        h(
          'div',
          { style: styles.listHeader },
          h('div', { style: styles.settingsTitle }, t('sessionsTitle')),
          h('button', { type: 'button', onClick: read, style: styles.linkButton }, t('refresh')),
        ),
        data === undefined
          ? h('div', { style: styles.sectionHint }, t('loading'))
          : rows.length === 0
            ? h('div', { style: styles.sectionHint }, t('emptySessions'))
            : rows.map((row) =>
                h(
                  'div',
                  { key: row.id, style: styles.settingsRow },
                  h(
                    'div',
                    { style: styles.settingsText },
                    h('div', { style: styles.sessionName }, row.title.length > 0 ? row.title : t('unnamedSession')),
                    h('div', { style: styles.settingsDesc }, row.live ? t('liveBadge') : shortId(row.id)),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      disabled: busy !== undefined,
                      onClick: () => setGuest(row.id, row.guest !== true),
                      style: styles.switchButton,
                    },
                    row.guest ? t('switchOn') : t('switchOff'),
                  ),
                ),
              ),
      );
    }

    function downloadJson(fileName, payload) {
      const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function ToolPickerButton(props) {
      const { sessionId, api, t } = props;
      const [board, setBoard] = React.useState(undefined);
      const [failure, setFailure] = React.useState(undefined);
      const [open, setOpen] = React.useState(false);
      const [busy, setBusy] = React.useState(undefined);
      const [position, setPosition] = React.useState({ left: 0, bottom: 0 });
      const [query, setQuery] = React.useState('');
      const [mode, setMode] = React.useState('tools');
      const [templates, setTemplates] = React.useState(undefined);
      const [draft, setDraft] = React.useState('');
      const trigger = React.useRef(null);
      const chooser = React.useRef(null);

      const fail = (error) => setFailure(error instanceof Error ? error.message : String(error));

      const read = React.useCallback(() => {
        let live = true;
        api
          .call('state', [sessionId])
          .then((value) => {
            if (!live) return;
            setBoard(value);
            setFailure(undefined);
          })
          .catch((error) => {
            if (!live) return;
            fail(error);
          });
        return () => {
          live = false;
        };
      }, [api, sessionId]);

      const readTemplates = React.useCallback(() => {
        let live = true;
        api
          .call('templates', [])
          .then((value) => {
            if (live) setTemplates(value.templates);
          })
          .catch((error) => {
            if (live) fail(error);
          });
        return () => {
          live = false;
        };
      }, [api]);

      React.useEffect(() => read(), [read]);

      React.useEffect(() => {
        if (!open || mode !== 'templates') return undefined;
        return readTemplates();
      }, [open, mode, readTemplates]);

      React.useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [open]);

      const show = () => {
        if (open) {
          setOpen(false);
          return;
        }
        const rect = trigger.current?.getBoundingClientRect();
        if (rect !== undefined && rect !== null) {
          setPosition({ left: rect.left, bottom: window.innerHeight - rect.top + 6 });
        }
        setOpen(true);
        read();
      };

      const toggle = (name, enabled) => {
        setBusy(name);
        api
          .call('setEnabled', [sessionId, name, enabled])
          .then((value) => {
            setBoard(value);
            setFailure(undefined);
          })
          .catch((error) => {
            setFailure(error instanceof Error ? error.message : String(error));
          })
          .finally(() => setBusy(undefined));
      };

      const toggleGuest = (enabled) => {
        setBusy('guest');
        api
          .call('setGuest', [sessionId, enabled])
          .then((value) => {
            setBoard(value);
            setFailure(undefined);
          })
          .catch(fail)
          .finally(() => setBusy(undefined));
      };

      const saveCurrent = () => {
        const name = draft.trim();
        if (name.length === 0) return;
        setBusy('template');
        api
          .call('saveTemplate', [sessionId, name])
          .then((value) => {
            setTemplates(value.templates);
            setDraft('');
            setFailure(undefined);
          })
          .catch(fail)
          .finally(() => setBusy(undefined));
      };

      const applyTemplate = (name) => {
        setBusy(`tpl:${name}`);
        api
          .call('applyTemplate', [sessionId, name])
          .then((value) => {
            setBoard(value);
            setFailure(undefined);
            setMode('tools');
          })
          .catch(fail)
          .finally(() => setBusy(undefined));
      };

      const removeTemplate = (name) => {
        setBusy(`tpl:${name}`);
        api
          .call('deleteTemplate', [name])
          .then((value) => setTemplates(value.templates))
          .catch(fail)
          .finally(() => setBusy(undefined));
      };

      const exportAll = () => {
        api
          .call('exportTemplates', [])
          .then((payload) => downloadJson('dsh-tool-templates.json', payload))
          .catch(fail);
      };

      const importFile = (event) => {
        const chosen = event.target.files?.[0];
        event.target.value = '';
        if (chosen === undefined) return;
        chosen
          .text()
          .then((text) => api.call('importTemplates', [text]))
          .then((value) => {
            setTemplates(value.templates);
            setFailure(undefined);
          })
          .catch(fail);
      };

      const tools = board?.tools ?? [];
      const needle = query.trim().toLowerCase();
      const shown = needle.length === 0 ? tools : tools.filter((tool) => tool.name.toLowerCase().includes(needle));
      const offCount = tools.filter((tool) => !tool.enabled).length;

      const elements = [
        h(
          'button',
          {
            key: 'trigger',
            ref: trigger,
            type: 'button',
            title: t('triggerHint'),
            onClick: show,
            style: styles.trigger,
          },
          h('span', null, t('trigger')),
          offCount > 0 ? h('span', { style: styles.badge }, String(offCount)) : null,
        ),
      ];

      if (open) {
        const rows = shown.length
          ? shown.map((tool) =>
              h(
                'button',
                {
                  key: tool.name,
                  type: 'button',
                  disabled: busy === tool.name,
                  title: tool.name,
                  onClick: () => toggle(tool.name, !tool.enabled),
                  style: styles.row(tool.enabled),
                },
                h('span', { style: styles.check(tool.enabled) }, tool.enabled ? '✓' : ''),
                h('span', { style: styles.name }, tool.name),
                h(
                  'span',
                  { style: { flex: 'none', fontSize: '11px', opacity: 0.7 } },
                  tool.enabled ? t('on') : t('off'),
                ),
              ),
            )
          : [
              h(
                'div',
                { key: 'empty', style: styles.empty },
                board === undefined && failure === undefined
                  ? t('loading')
                  : needle.length > 0
                    ? t('noMatch')
                    : t('empty'),
              ),
            ];

        const templateRows = (templates ?? []).length
          ? templates.map((entry) =>
              h(
                'div',
                { key: entry.name, style: styles.templateRow },
                h('span', { style: styles.templateName, title: entry.tools.join(', ') }, `${entry.name} (${entry.tools.length}${entry.guest ? ` · ${t('guest')}` : ''})`),
                h(
                  'span',
                  { style: styles.rowActions },
                  h(
                    'button',
                    { type: 'button', style: styles.link, disabled: busy === `tpl:${entry.name}`, onClick: () => applyTemplate(entry.name) },
                    t('apply'),
                  ),
                  h(
                    'button',
                    { type: 'button', style: styles.link, disabled: busy === `tpl:${entry.name}`, onClick: () => removeTemplate(entry.name) },
                    t('remove'),
                  ),
                ),
              ),
            )
          : [h('div', { key: 'none', style: styles.empty }, templates === undefined ? t('loading') : t('emptyTemplates'))];

        const toolsBody = [
          h(
            'button',
            {
              key: 'guest',
              type: 'button',
              disabled: busy === 'guest',
              title: t('guestHint'),
              onClick: () => toggleGuest(board?.guest !== true),
              style: styles.guestRow,
            },
            h('span', { style: styles.check(board?.guest === true) }, board?.guest === true ? '✓' : ''),
            h(
              'span',
              { style: styles.guestText },
              h('span', null, t('guest')),
              h('span', { style: styles.guestSub }, t('guestHint')),
            ),
          ),
          h('input', {
            key: 'search',
            type: 'search',
            value: query,
            placeholder: t('search'),
            onChange: (event) => setQuery(event.target.value),
            style: styles.search,
          }),
          h('div', { key: 'list', style: styles.list }, rows),
          h(
            'div',
            { key: 'footer', style: styles.footer },
            h('span', { style: styles.count }, `${board?.enabledCount ?? 0}/${tools.length}`),
            h('button', { type: 'button', style: styles.link, onClick: () => setMode('templates') }, t('templates')),
            h('button', { type: 'button', style: styles.done, onClick: () => setOpen(false) }, t('close')),
          ),
        ];

        const templateBody = [
          h('div', { key: 'list', style: styles.list }, templateRows),
          h(
            'div',
            { key: 'save', style: { display: 'flex', gap: '4px', marginTop: '8px', alignItems: 'center' } },
            h('input', {
              type: 'text',
              value: draft,
              placeholder: t('namePlaceholder'),
              onChange: (event) => setDraft(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter') saveCurrent();
              },
              style: { ...styles.search, marginTop: 0, flex: 1 },
            }),
            h('button', { type: 'button', style: styles.done, disabled: busy === 'template', onClick: saveCurrent }, t('save')),
          ),
          h(
            'div',
            { key: 'io', style: { display: 'flex', gap: '4px', marginTop: '6px', alignItems: 'center' } },
            h('button', { type: 'button', style: styles.link, onClick: exportAll }, t('exportLabel')),
            h('button', { type: 'button', style: styles.link, onClick: () => chooser.current?.click() }, t('importLabel')),
            h('input', {
              ref: chooser,
              type: 'file',
              accept: 'application/json,.json',
              style: { display: 'none' },
              onChange: importFile,
            }),
          ),
          h(
            'div',
            { key: 'footer', style: styles.footer },
            h('button', { type: 'button', style: styles.link, onClick: () => setMode('tools') }, t('back')),
            h('button', { type: 'button', style: styles.done, onClick: () => setOpen(false) }, t('close')),
          ),
        ];

        elements.push(
          h('div', { key: 'backdrop', style: styles.backdrop, onClick: () => setOpen(false) }),
          h(
            'div',
            { key: 'panel', style: styles.panel(position), onClick: (event) => event.stopPropagation() },
            h('div', { style: styles.headerTitle }, mode === 'tools' ? t('title') : t('templates')),
            h('div', { style: styles.headerHint }, t('subtitle')),
            failure === undefined
              ? null
              : h('div', { style: styles.error }, `${mode === 'tools' ? t('failed') : t('templateFailed')}: ${failure}`),
            ...(mode === 'tools' ? toolsBody : templateBody),
          ),
        );
      }

      return h(React.Fragment, null, elements);
    }

    function describe(methods) {
      return {
        package: PACKAGE,
        descriptors: Object.entries(methods).map(([endpoint, definition]) => {
          const separator = endpoint.indexOf('/');
          const namespace = endpoint.slice(0, separator);
          const method = endpoint.slice(separator + 1);
          const parameters = definition.parameters.map((parameter) => ({
            ...parameter,
            wire: parameter.wire ?? parameter.name,
          }));
          return {
            ...definition,
            id: `${PACKAGE}#${endpoint}`,
            namespace,
            method,
            parameters,
            result: definition.result,
          };
        }),
      };
    }

    const contribution = describe({
      'toolPicker/state': {
        service: 'toolPicker',
        description: 'Read which tools one live session may call.',
        invocation: { kind: 'direct' },
        parameters: [{ name: 'sessionId', description: 'the live session id', source: 'json', codec: stringCodec, strictCodec: stringCodec }],
        result: stateResult,
      },
      'toolPicker/setEnabled': {
        service: 'toolPicker',
        description: 'Switch one tool on or off for exactly one session.',
        invocation: { kind: 'direct' },
        parameters: [
          { name: 'sessionId', description: 'the live session id', source: 'json', codec: stringCodec, strictCodec: stringCodec },
          { name: 'toolName', description: 'the tool name shown to the model', source: 'json', codec: stringCodec, strictCodec: stringCodec },
          { name: 'enabled', description: 'true to allow the tool, false to hide it', source: 'json', codec: booleanCodec, strictCodec: booleanCodec },
        ],
        result: stateResult,
      },
      'toolPicker/setGuest': {
        service: 'toolPicker',
        description: 'Turn guest mode on or off for one session: workspace-only file access, no shell.',
        invocation: { kind: 'direct' },
        parameters: [
          { name: 'sessionId', description: 'the live session id', source: 'json', codec: stringCodec, strictCodec: stringCodec },
          { name: 'enabled', description: 'true to confine the session to its workspace', source: 'json', codec: booleanCodec, strictCodec: booleanCodec },
        ],
        result: stateResult,
      },
      'toolPicker/sessions': {
        service: 'toolPicker',
        description: 'Every conversation of this profile with its guest-mode state, plus the new-conversation default.',
        invocation: { kind: 'direct' },
        parameters: [],
        result: stateResult,
      },
      'toolPicker/setDefaultGuest': {
        service: 'toolPicker',
        description: 'Make brand-new sessions start in guest mode.',
        invocation: { kind: 'direct' },
        parameters: [{ name: 'enabled', description: 'true to default new sessions to guest mode', source: 'json', codec: booleanCodec, strictCodec: booleanCodec }],
        result: stateResult,
      },
      'toolPicker/templates': {
        service: 'toolPicker',
        description: 'List every saved tool template.',
        invocation: { kind: 'direct' },
        parameters: [],
        result: templatesResult,
      },
      'toolPicker/saveTemplate': {
        service: 'toolPicker',
        description: 'Save the current switches of one session under a name.',
        invocation: { kind: 'direct' },
        parameters: [
          { name: 'sessionId', description: 'the live session id', source: 'json', codec: stringCodec, strictCodec: stringCodec },
          { name: 'name', description: 'the template name', source: 'json', codec: stringCodec, strictCodec: stringCodec },
        ],
        result: templatesResult,
      },
      'toolPicker/applyTemplate': {
        service: 'toolPicker',
        description: 'Replace one session switches with a saved template.',
        invocation: { kind: 'direct' },
        parameters: [
          { name: 'sessionId', description: 'the live session id', source: 'json', codec: stringCodec, strictCodec: stringCodec },
          { name: 'name', description: 'the template name', source: 'json', codec: stringCodec, strictCodec: stringCodec },
        ],
        result: stateResult,
      },
      'toolPicker/deleteTemplate': {
        service: 'toolPicker',
        description: 'Delete one saved template.',
        invocation: { kind: 'direct' },
        parameters: [{ name: 'name', description: 'the template name', source: 'json', codec: stringCodec, strictCodec: stringCodec }],
        result: templatesResult,
      },
      'toolPicker/exportTemplates': {
        service: 'toolPicker',
        description: 'Return a portable payload of every saved template.',
        invocation: { kind: 'direct' },
        parameters: [],
        result: templatesResult,
      },
      'toolPicker/importTemplates': {
        service: 'toolPicker',
        description: 'Merge an exported template payload back in.',
        invocation: { kind: 'direct' },
        parameters: [{ name: 'payload', description: 'exported JSON text', source: 'json', codec: stringCodec, strictCodec: stringCodec }],
        result: templatesResult,
      },
    });

    /**
     * Mount the Remote surface lazily but synchronously: the mount starts during `apply`,
     * while the Slot registration happens outside any await so a broken transport still
     * leaves the trigger visible with a readable reason.
     */
    function createApi(ctx) {
      const api = { mountError: undefined, namespace: undefined, ready: undefined };
      let resolveReady = () => {};
      api.ready = new Promise((resolve) => {
        resolveReady = resolve;
      });
      api.call = async (method, args) => {
        await api.ready;
        if (api.mountError !== undefined) throw new Error(api.mountError);
        const namespace = api.namespace;
        if (namespace === undefined) throw new Error('toolPicker namespace unavailable');
        const result = await namespace[method](...args);
        if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
        return result.value;
      };
      const mounted = ctx.remote.$mount(contribution).then(
        () => undefined,
        (error) => {
          api.mountError = error instanceof Error ? error.message : String(error);
        },
      );
      mounted.then(() => {
        if (api.mountError !== undefined) {
          resolveReady();
          return;
        }
        // The namespace service only exists once the mount installed it, and the cordis
        // proxy refuses `ctx.remote.<namespace>` unless the key is declared through inject.
        const timer = setTimeout(() => resolveReady(), 3000);
        ctx.inject(['remote.toolPicker'], (scoped) => {
          clearTimeout(timer);
          api.namespace = scoped.remote.toolPicker;
          resolveReady();
        });
      });
      return api;
    }

    return {
      inject: ['remote', 'slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-tool-picker dictionary');
        const t = ctx.locale.bind(NS);
        const api = createApi(ctx);

        ctx.slots.inject('conversation.input.left', () =>
          ctx.slots.register(
            {
              name: 'conversation.input.left',
              id: 'dsh-tool-picker',
              order: 30,
              locale: NS,
              inject: (sessionId) => ({ sessionId, api, t }),
            },
            ToolPickerButton,
          ),
        );

        // One settings page on the left nav, placed right after "Agent presets": guest
        // mode is a per-conversation policy, so it reads as a list rather than a popover.
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'tool-picker',
              order: 22,
              label: () => t('sectionTitle'),
              locale: NS,
              inject: () => ({ api, t }),
            },
            GuestSettingsSection,
          ),
        );
      },
    };
  },
});
