# Mirasim Provider

Mirasim 作为独立的 `mirasim` provider 登记。Discord 网关、频道白名单、thread 路由、排队和消息发送由 agents-in-discord 管理；模型执行使用正在运行的 Mirasim 桌面应用的本地 WebSocket API。Harness 独立于模型选择，默认使用 Claude Code、`claude-opus-5-5[1m]`、`high`；其他 harness 使用各自原生默认模型和推理力度。

## 登录与配置

在 Mirasim 桌面端完成登录，保持应用运行。无需安装额外 CLI、不复制模型凭据、不修改应用包。原生 Discord 连接应由用户断开，同一个 bot token 不能同时交给两个网关进程。

`.env.example` 已提供独立配置项。部署时设置：

```dotenv
MIRASIM__DISCORD_TOKEN=<Discord bot token>
MIRASIM__ALLOWED_CHANNEL_IDS=<允许的父频道 ID>
MIRASIM__MENTION_ONLY=false
MIRASIM__CHILD_THREAD_WORKSPACE_MODE=inherit
MIRASIM__SLASH_PREFIX=mira
MIRASIM_URL=ws://127.0.0.1:4970/ws
MIRASIM_DEFAULT_HARNESS=claude
MIRASIM_DEFAULT_MODEL=claude-opus-5-5[1m]
MIRASIM_DEFAULT_EFFORT=high
```

本次迁移使用的父频道为 `1485303736673898579`。部署时复用原 bot 身份，但使用新的 `MIRASIM__DISCORD_TOKEN` 配置，不将 provider 冒充为 zcode。开发阶段不自动复制 token、启动网关或变更已有 bot 服务。

检查是否存在共享 `ALLOWED_GUILD_IDS`、`MENTION_ONLY_CHANNEL_IDS` 或 guild 级 mention 覆盖，避免共享配置扩大白名单或覆盖免 @ 设置。频道白名单包含它的 thread；不会包含其他频道。私有 thread 仍需 Discord 授予 bot 访问权限。忽略其他 bot 的消息。每个 thread 绑定独立 Mirasim 会话，即使继承同一工作目录，也不共享聊天历史。

```bash
npm run start:mirasim
```

独立启动使用 `BOT_PROVIDER=mirasim`，状态文件带 `.mirasim` 后缀。共享实例也可在 provider 设置中选择 Mirasim。`MIRASIM_DEFAULT_MODEL` / `MIRASIM_DEFAULT_EFFORT` 仅覆盖 Claude harness 的默认值，不继承其他 provider 的共享 `DEFAULT_MODEL`，也不会把 Claude 参数传给 Codex 等引擎。

## 设置与会话

- `/mira_settings` 提供 Harness、模型、推理强度、工作目录、回复方式和语言设置。Harness 从 `ready → init.agents` 读取，只允许选择已安装项；刷新按钮重新读取原生清单和当前模型目录。不能用 `listClis` 的首个探测中间帧判定安装状态。
- 频道设置由 thread 继承，thread 可独立覆盖。模型与推理参数只在相同 harness 间继承；每个 harness 独立缓存目录，提交前重新校验安装状态、模型和推理选项。没有暴露目录的引擎不填造模型或推理参数。
- 切换 harness 会清除当前频道及继承 thread 的旧会话绑定、模型和推理覆盖，保留桌面历史。显式固定 harness 的 thread 不受影响；暂时切到其他 provider 的 thread 也会清理其旧 Mirasim 绑定。存在运行中或排队任务时拒绝切换，保存失败回滚内存设置。
- `!new` / `!reset` 清除 bot 的会话绑定，不删除桌面历史；`!resume <harness>:<id>` 按原生会话键续接。实际提交前检查 harness、续接能力、会话存在、工作目录一致及忙碌状态。手动修改环境默认 harness 后遇到旧绑定不自动迁移，需要新建会话。
- `!sessions` / `/mira_sessions` 只查询当前工作目录、当前 harness 的会话。
- 取消与超时向已接受的会话发送 `stop`，不会终止 Mirasim 应用。连接中断、接受超时和不完整输出均报告失败，不自动重放可能已执行的任务。
- 登录、计费路由、工具权限和原生自动压缩由 Mirasim 桌面端管理。Discord 不提供无效的 safe/dangerous、fast、runtime 或压缩覆盖。已有显式 mode override 需要用 `!mode default` 清除。
- 如遇原生交互审批，在桌面端处理；适配器不会自动批准。图片作为原生附件传递。

## 本地接口边界

仅接受数字 loopback 地址上的 `ws://.../ws`，不走 Discord 代理，不跟随重定向。每次连接重新读取 `~/.mirasim/run/local-4970.token`；可用 `MIRASIM_TOKEN_FILE` 指定路径，不将 token 写进日志或配置。

协议已针对 Mirasim `0.0.354` 检查。使用应用已有接口，但没有官方稳定兼容承诺；升级后应复测。应用未启动、登录失效、目录或会话协议错误会报告失败，不回退到另一 CLI 或模型。

## 独有设计与支持边界

以下基于本机 `0.0.354` 的服务端/UI 协议扫描及只读 API 核实，不代表这些能力都已经接入 Discord。清单不是固定产品枚举，实际以桌面端返回为准。

| 设计 | 原生接口或字段 | 当前支持与建议 |
| --- | --- | --- |
| Harness 与能力声明 | `init.agents[].capabilities`、`getCatalog(agent)` | 已接入选择、继承、目录、会话隔离；面板展示原生能力，不把原生支持误报为 bot 已实现 |
| 自定义启动命令、参数、显示顺序 | `setAgentLaunch`、`setAgentList` | 继续由桌面管理，bot 使用其执行结果；命令和参数会影响全局运行环境，不能按频道随意改 |
| Agent preset | `listSubAgents(agent, workdir)`、`prompt.agentPreset` | 与 harness 不同。下一步可做独立 Preset 选择，按 harness/workspace 获取、校验、继承，不能复用 Provider 或 Model 菜单 |
| 原生交互与审批 | `snapshot.interactions`、`interact(promptId, action, value)` | 当前提示回桌面处理、不自动批准。后续需绑定当前 task、校验用户权限、处理过期与重复点击，再提供 Discord 按钮 |
| 运行中插话与 outbox | `steer` 能力、`recall`、`reorder`、`stopAndRun` | 当前由 bot 排队，取消仅作用于自己已接受的任务。后续按能力支持 steer，必须区分排队消息 ID、运行任务 ID，不能把普通后续消息误作中断 |
| Fork、rewind、原生历史 | `forkSession`、`rewindSession`、`listSessions` | 已支持目录内历史和续接。Fork/rewind 需独立命令及能力校验，不能假设各 harness 都支持；rewind 还需明确文件状态影响 |
| Model layer、profiles、provider 与路由 | `getModelLayer`、`setActiveProfile`、`setSessionRoute`、`routeByModel` | 读取原生模型目录，默认不改路由。模型的底层供应商不等于 Discord provider；账号、relay、费用可能全局变化，保留桌面管理 |
| 输出风格、thinking、service tier、自动压缩 | `getCatalog`、`setAgentDefaults` | 目前沿用原生设置。部分 UI 修改实际写全局默认，不能包装成 thread 局部开关；需要先确认逐会话/逐请求的真实覆盖语义 |
| 产物与大文件 | `listArtifacts`、`readArtifactBytes`、`readArtifactChunk` | 值得后续接入附件回传；必须绑定当前会话/工作目录，校验路径、大小和 MIME，避免泄露其他任务产物 |
| Skills、MCP、connectors、plugins | 原生安装与项目配置接口 | 原生 harness 已加载的能力可使用；暂不开放 Discord 安装入口，避免新增工具权限及安装副作用 |
| Goal、成员协作、调度 | `createGoal`、`setGoalMembers`、`assignGoalWork`、`upsertSchedule` | 属于跨消息的持久任务系统，不是普通 setting。未来单独设计 ownership、状态同步、取消和重连去重 |
| Computer Use、远端机器、Mirachannel | 原生设备、浏览器、系统权限、远端 enrollment 接口 | 保留桌面控制，不从 slash settings 静默开启权限、注册设备或改执行机器 |

优先顺序建议：原生审批与等待状态、Preset、能力限定的 steer、当前任务产物回传。全局账号/路由/启动命令不应为追求设置齐全而搬进频道面板。

## 验证

```bash
npm run test:mirasim
node scripts/start-instance.mjs mirasim --dry-run
```

测试覆盖真实 loopback WebSocket 收发、续接、流式拼接、序列缺口、取消、超时、断连、工作目录隔离、Harness 继承/切换/持久化回滚、未安装引擎拒绝、旧面板失效与分引擎目录。

2026-09-24 实机只读清单显示已安装 Claude Code、Codex、Antigravity、Grok Build。Claude 与 Codex 均通过真实桌面 API 新建无工具测试任务，分别返回 `HARNESS_CLAUDE_OK` / `HARNESS_CODEX_OK`；模型分别为 `claude-opus-5-5[1m]` / `gpt-6-sol`。Codex 同一会话续接也正确回忆上一轮标记。其他 harness 只验证了发现能力，没有声称执行验收通过。

验证命令：`node --test test/mirasim.test.mjs`；`node --test test/settings-panel.test.mjs`；`node --test --test-name-pattern=Mirasim test/session-store.test.mjs`。另运行了 session/settings/actions/store、runner、app-context、report、provider-sessions、Discord routing、prompt、onboarding、bootstrap、slash 相关回归。面板新增分支曾发现空 session 访问错误，改为读取已构建的 snapshot 后，面板全套 74 项通过。`node --check src/index.js` 与 `git diff --check` 通过。

Discord 上线及实际频道验收是独立部署步骤，不由开发测试代替。本次不启动网关，不修改账号、权限、relay、原生 Discord 连接或现有 bot 服务。
