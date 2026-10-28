# dsh-tool-picker

给 [DeepSeek Harness](https://github.com/deepseek-ai) 加一个**按会话控制模型能用哪些工具**的小插件。

同一个 Harness 里，A 会话只给只读工具、B 会话放开全部、C 会话进「访客模式」只能碰工作区——互不影响。设置都落在磁盘上，重启不丢。

- Host 侧用 `ctx.tools.restrict()` / `ctx.tools.guard()` 实现，作用于 **agent 作用域上下文**，所以工具列表（schema）、查找、执行三处同时生效——被关掉的工具模型根本看不见。
- 客户端是一个普通 DSH 插件：写作面板在输入框左侧，设置页多一个「访客模式」页面。

## 功能

### 1. 会话工具栏

输入框左侧的「工具」按钮打开面板：

- 逐项开关当前会话可用的工具（`read` / `write` / `edit` / `glob` / `grep` / `web_search` …）
- 顶部搜索框过滤工具名
- 「访客模式」快捷键（只影响当前会话）
- 底部显示 `已启用 / 总数`

只列出**可被限制的**工具：全局注册的工具与上层继承的工具。会话自己注册的工具不在此列（受限层管不到它们）。

### 2. 访客模式（workspace-only）

开启后：

- 关掉 `bash` / `pwsh` / `shell` / `terminal` / `exec` / `subagent` / `workflow`（子代理不继承守卫，所以整个禁掉）
- 给 `read` / `read_image` / `write` / `edit` / `glob` / `grep` 加路径守卫：**只允许工作区内的路径**

路径判断做了两层：先按字面 `resolve()` 比，再按 `realpath()` 比——所以工作区里放一个指向 `C:\Windows` 的 junction/软链接也穿不出去。越界时模型收到的是明确的拒绝理由，而不是一个含糊的失败：

```
访客模式：read 不能访问工作区之外的路径 "C:\Windows\win.ini"（工作区：E:\work\demo）
访客模式：glob 的模式 "../**/*.json" 可能越出工作区（工作区：E:\work\demo）
```

> 注意：这是**工具层**的守卫，与宿主沙箱模式（`read-only` / `workspace-write` / `danger-full-access`）无关。开 `danger-full-access` 时它依然生效；但 `bash` 被关掉之前它管不住 shell 里跑出来的命令——这也是访客模式直接把 shell 类工具关掉的原因。

### 3. 模板

把一套工具开关 + 访客状态存成模板，一键套用到任意会话；支持导出/导入 JSON：

```json
{
  "version": 2,
  "templates": {
    "访客模式": { "tools": ["bash", "pwsh", "subagent", "workflow"], "guest": true },
    "只读模式": { "tools": ["bash", "pwsh", "write", "edit"], "guest": false }
  }
}
```

仓库里的 [`presets.json`](./presets.json) 就是一份可直接导入的样例。

### 4. 设置页：访客模式

设置左侧会多出一页「访客模式」：

- **新对话默认开启**：新会话自动带访客模式，现有会话不受影响
- **按会话设置**：列出侧边栏里的会话，逐个开关，不用一个个点开弹窗

已归档会话、子会话不出现；列表会去重并隐藏空会话。

### 5. 斜杠命令

不想点鼠标的话：

```
/tools                      列出本会话工具与开关状态
/tools off write,edit       关掉指定工具（逗号分隔）
/tools on write             打开
/tools guest [on|off]       切换访客模式（不带参数则取反）
/tools default [on|off]     新对话是否默认开访客模式
/tools reset                清掉本会话记录，恢复全部工具
/tools templates            列出模板
/tools save <名字>           把当前状态存成模板
/tools apply <名字>          套用模板
/tools delete <名字>         删除模板
```

## 安装

### 通过插件管理器（推荐）

在 DSH 里让模型执行：

```
plugin_manager action=install_bundle target=<本地绝对路径 或 本仓库 npm spec>
```

或者手动把本包加进 profile 的 `dsh.profile.bundles`，让 loader 加载。

### 手动

```yaml
# <profile>/cordis.patch.yml
- insert:
    - id: dsh-tool-picker
      name: 'dsh-tool-picker'
```

要求：

- 包必须是 ESM（`"type": "module"`）
- `exports` 里必须带 `"./package.json"` —— 缺了它，DSH 的客户端模块表会**静默跳过**整个客户端半身（不报错，面板就是不出来）
- `dsh.bundle.patch` 指向 `cordis.patch.yml`
- `dsh.client.inject` 声明依赖的客户端服务包

## 数据

```
<profile>/data/dsh-tool-picker/state.json
```

```json
{
  "version": 4,
  "defaults": { "disabled": [], "guest": false },
  "sessions": {
    "<sessionId>": { "disabled": ["write"], "guest": true }
  },
  "templates": {
    "访客模式": { "tools": ["bash", "subagent"], "guest": true }
  }
}
```

- `disabled` 记的是**被关掉的**工具名，不是允许列表——这样新工具默认就是开着的
- 无会话记录时读到的是「全开、访客关」，**不会**继承 `defaults`（`defaults` 只在会话启动时拷一份，避免老会话被全局开关牵连）
- 写盘失败只记 warn，不阻塞会话

## 实现说明

| 层 | 关键点 |
|---|---|
| Host | `agent.ctx.tools.restrict({ deny })` 掩码该 agent 的工具；`agent.ctx.tools.guard(fn)` 做路径守卫。两者都是 context-owned effect，dispose 即撤销 |
| 会话生命周期 | 监听 `agent/created`（`source === 'startup'` 时把 defaults 拷进新会话）与 `agent/disposed`（清 disposer） |
| RPC | 手写 `typertRemote` 绑定 + 原型上的 `remote-methods` 标记，走网关的 source descriptors 回退，无需代码生成 |
| 客户端 | `ctx.remote.$mount(contribution)` 挂自定义命名空间；槽位 `conversation.input.left`（面板）与 `settings.section`（设置页） |
| 持久化 | 直接读写 profile 下的 JSON（`node:fs`），不用 storage 服务 |

## 已知限制

- 只能**移除**工具，不能凭空添加（`restrict` 的语义决定的）
- `run_code` 不能点名限制（PTC 模式的传输层工具，点名会抛错）
- 会话自己注册的工具不受控（它们不在可限制集合里）
- 子代理不继承父会话的守卫，所以访客模式直接禁掉 `subagent` / `workflow`
- 客户端的 bundle 在**宿主启动时**快照：改了 `client.js` 必须重启宿主，刷新页面无效

## 开发

```bash
node smoke.mjs        # 假 ctx 跑一遍 state/setEnabled/setGuest/templates/命令
node --check client.js
```

`smoke.mjs` 用伪造的 `ctx`（tools/agents/provide/on/inject）验证 Host 侧逻辑，不需要启动 DSH。

## License

MIT © 2026 ptilroko

---

## English

A small DeepSeek Harness plugin for **per-session tool control**.

Each conversation gets its own allow/deny state: toggle tools from the button left of the composer, or switch on **Guest mode** to confine every file operation to the session workspace (shell and sub-agents are disabled, since tool guards are not inherited by child agents).

State lives in `<profile>/data/dsh-tool-picker/state.json`; templates can be exported/imported as JSON. Host side is `ctx.tools.restrict()` + `ctx.tools.guard()` on the agent-scoped context, so hidden tools disappear from the schema, from lookup, and from execution at once.
