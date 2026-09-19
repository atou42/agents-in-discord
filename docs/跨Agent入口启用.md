# 跨 Agent 入口启用

用户已授权启用并重启现有 Discord Agent 实例。仅配置现有的 Codex、Claude、Grok、Cursor、OMP；不启用已停用的其它服务。

## 接收地址

| 接收方 | CLI --socket |
| --- | --- |
| Codex | /Users/atou/.aid-tasks/tasks.sock |
| Claude | /Users/atou/.aid-tasks-claude/tasks.sock |
| Grok | /Users/atou/.aid-tasks-grok/tasks.sock |
| Cursor | /Users/atou/.aid-tasks-cursor/tasks.sock |
| OMP | /Users/atou/.aid-tasks-omp/tasks.sock |

任一同 UID 的 Agent 使用同一 CLI，选择接收方 socket：

```sh
node /Users/atou/agents-in-discord/scripts/submit-task.mjs \
  --socket /Users/atou/.aid-tasks-claude/tasks.sock \
  --request-id cross-agent-example-001 \
  --source-thread SOURCE_THREAD_ID --target-thread CLAUDE_THREAD_ID \
  --kind task --prompt-file /absolute/path/task.txt
```

接收方必须已经在自己的 settings → 跨会话消息中选择策略；本次不代替用户设置完全放行。已有 thread 复用接收方自身 session。新任务使用 --parent 和 --title 替代 --target-thread，独立工作区。通知使用 --kind notify，不触发运行。

## 权限

发现并修正了跨 Agent 来源被接收方白名单拒绝的问题：来源可以属于已显式配置 provider-scoped LOCAL_TASK_SOCKET_DIR 的本机 Agent 的显式频道或服务器白名单，同时服从该来源实例的显式用户限制。目标仍只使用接收方白名单，不合并、不扩大。接收方用户白名单及真实 Discord 成员对来源、目标的权限仍必须通过；不赋予来源 Agent 额外 runner 权限。

同 UID 本机入口仍是信任边界，不将来源 thread 字段视为密码学 Agent 身份。未启用入口的 provider、没有显式来源频道规则的 provider 不贡献来源范围。各机器人 Discord 账号必须能访问所需来源和目标；没有该权限会报告失败，不自动改 Discord 角色。

## 验证与重启

生产目录执行 `node --test test/local-task-source-access.test.mjs test/local-task-submission.test.mjs`，50 项通过。覆盖真实本地 socket、CLI、队列、来源范围、跨 Agent 用户限制、未启用来源拒绝、接收方目标不扩权、持久化及恢复。Discord 和 runner 为测试替身，不是跨 Agent 端到端结论。

重启使用既有 restart-discord-bot-service.sh。每个实例必须连续两次新鲜空闲心跳且无其持有的工作区锁才重启；结果不确定不自动重复。核验新 PID、ready、独立 socket 0600 / 目录 0700、无副作用 API 探测以及实际 Discord slash 注册。证据位于 `workspaces/1550810498470256691/跨Agent-<provider>-重启结果.json`，receiver_ready 表示该实例完成核验。

Codex 当前承载本次会话，最后安排空闲重启，不能把“已安排”说成“已完成”。其它实例逐个重启并即时核验。真实跨 Agent 任务验收待接收策略设置后进行，既有 Codex thread 内已通过的验收不冒充跨 Agent 成功。

2026-09-20（北京时间）实际核验：Claude PID 93250、Grok PID 93660、Cursor PID 93903、OMP PID 94297 均已出现 receiver_ready，真实 Discord 注册了对应的 agent-messages 及 settings 命令。四者 policy=null，未越权替用户设置。入口分别为 `/cc_settings`、`/grok_settings`、`/cursor_settings`、`/omp_settings` 的“跨会话消息”。

使用实际 .env 加载每个 provider 的配置，核对五个 socket 路径彼此独立，并以用户 477027411532316683 检查 5×5 来源频道矩阵，25 项均通过。这仅证明配置层允许跨来源，不替代 Discord 成员权限或实际 runner 验收。
