# 05 参考项目对比分析

## 1. 文档目的

这份文档把当前与 AI OS 最相关的 6 个参考对象放到同一张技术地图里：

- `Proma`
- `CodePilot`
- `AionUi`
- `Claude Code`
- `openai/codex`
- `Alma`

它不回答“谁最好”，而回答这些更重要的问题：

- 它们分别最强在哪一层
- 哪些模块主要是自研，哪些主要是集成已有 SDK / 服务
- 哪些层适合我们直接复用
- 哪些层只能吸收思路，不能直接照搬

这是一份研究对比文档，不是开发合同。

- backlog 与吸收优先级以 `06-reference-absorption-and-iteration-plan.md` 为准
- 协议与对象边界以 `03-capability-layer-principles.md` 为准
- 发版顺序以 `04-implementation-roadmap.md` 为准

## 2. 证据边界

这轮对比混合使用了两类材料：

1. 最新远端快照分析
2. 本地重建 / 本地提取快照分析

这个区分必须保留，因为并不是每个项目都能拿到公开最新源码。

| 项目 | 分析类型 | 版本 / 快照 | 说明 |
| --- | --- | --- | --- |
| Proma | 最新远端快照 | `a0efa8e` | 单独拉到临时目录分析，避免污染本地已有副本 |
| CodePilot | 最新远端快照 | `85f7f06` | 单独拉到临时目录分析，避免污染本地已有副本 |
| AionUi | 最新远端快照 | `3366858` | 单独拉到临时目录分析，避免污染本地已有副本 |
| Codex | 最新远端快照 | `1c24347` | 单独拉到临时目录分析，避免污染本地已有副本 |
| Claude Code | 本地重建源码 | `2.1.88` / 本地 repo `78be903` | 基于 `ClaudeCodeRev` 重建源码树和本地研究文档 |
| Alma | 本地提取快照 | `0.0.750` | 基于提取 bundle、本地格式化代码和研究文档；公开仓库不可访问 |

## 3. 一句话产品定位

| 项目 | 一句话定位 |
| --- | --- |
| Proma | Agent 工作台 |
| CodePilot | 多模型本地 AI 客户端平台 |
| AionUi | AI cowork 平台与 agent hub |
| Claude Code | 生产级 controlled tool-loop coding agent runtime |
| Codex | 本地 agent runtime 平台与 app-server 协议核心 |
| Alma | 本地优先 AI OS 原型 |

## 4. 项目级对比

| 项目 | 主运行时 | 最强层 | 对我们当前阶段不该直接照搬的层 |
| --- | --- | --- | --- |
| Proma | Electron + Bun + TypeScript | Agent 编排、远程桥接、工作区化 Agent 运行时 | 产品对象模型没有 Alma 深，不适合直接拿来当 AI OS 产品骨架 |
| CodePilot | Electron + Next.js + SQLite | Provider 治理、Bridge、Assistant Workspace、Memory 检索 | 平台外延很宽，直接照搬会过重 |
| AionUi | Electron + Node/Express + React + SQLite | ACP agent hub、扩展系统、频道插件、Team、Cron | 产品面太宽，最容易把我们拖进过度设计 |
| Claude Code | Bun + TypeScript + Ink UI | Query loop、工具协议、权限系统、任务运行时、多 Agent | Anthropic 中心化假设不能定义 AI OS 核心 |
| Codex | Rust core + app-server + CLI/TUI/SDK | Executor protocol、app-server protocol、thread-turn-item-event、sandbox | 产品壳与个人产品层不是重点参考 |
| Alma | Electron 控制平面 + React renderer + SQLite | Workspace、Artifact、Prompt App、主进程控制平面、本地长期运行时 | 太重，不能整体照抄 |

## 5. LLM 与 AI 供应商策略对比

| 项目 | 供应商策略 | 主要实现方式 | 自研还是集成 |
| --- | --- | --- | --- |
| Proma | Chat 支持很多供应商；Agent 以 Claude Agent SDK 为中心 | Chat 侧自研 provider adapter；Agent 侧 Claude SDK 宿主 | 混合 |
| CodePilot | 宽供应商目录 + 强 resolver/doctor | `Claude SDK runtime + Native AI SDK runtime` 双路径 | 供应商治理层强自研，底层调用集成 SDK |
| AionUi | 宽供应商面 + built-in agent + ACP/CLI agents | 协议检测 + SDK 路由 + ACP agent hub | 混合，平台化很强 |
| Claude Code | Anthropic 中心化，多部署后端 | 围绕 Anthropic SDK 和内部运行时的 controlled loop | 运行时强自研，模型调用集成 |
| Codex | 内建 provider 很窄，通过 OpenAI-compatible Responses API 扩展 | 协议优先的 provider config + app-server 集成 | 抽象层强自研 |
| Alma | 厚 provider catalog + 多 AI SDK | 主进程统一编排 provider 能力 | 混合，但产品化程度很高 |
| 我们当前产品 | 只做 OpenAI-compatible / Anthropic-compatible | Provider Protocol 后面接自写 HTTP adapter | 当前是刻意收敛的自研方案 |

### 5.1 直接结论

- `Proma` 最适合看“多供应商 Chat”和“Claude Agent SDK Agent”怎么并存。
- `CodePilot` 最适合看 `Provider Catalog / Resolver / Doctor`。
- `AionUi` 最适合看“HTTP provider、本地 built-in agent、ACP/CLI agent”怎么统一进一个平台。
- `Claude Code` 不适合拿来学供应商广度，适合拿来学：
  - Query loop
  - tool execution
  - permission model
  - task runtime
- `Codex` 不适合学“多厂商 provider 列表”，适合学协议型 executor 与 app-server。
- `Alma` 证明了厚 provider 层可以被塞进本地 AI OS 控制平面，但这不是我们当前阶段该直接复制的重量。

## 6. 聊天、消息与会话模型对比

| 项目 | 核心会话模型 | 持久化模型 | 对我们的价值 |
| --- | --- | --- | --- |
| Proma | Chat 链和 Agent 链分离 | 本地 JSON / JSONL | 适合参考应用层编排 |
| CodePilot | 会话化 SSE 对话，runtime 输出统一 | SQLite | 适合参考“桌面产品如何后端化聊天” |
| AionUi | `conversationBridge` 把桌面/WebUI/频道统一进一个对话总线 | SQLite | 适合参考多入口统一消息中枢 |
| Claude Code | Session + QueryEngine + tool loop + task runtime | 本地文件 + 长期运行时状态 | 适合参考生产级 agent loop |
| Codex | `thread / turn / item / event` | SQLite state + rollout history | 适合参考 executor 和 app-server 协议 |
| Alma | Thread 是绑定 workspace / artifact / prompt app 的工作容器 | SQLite | 适合参考产品对象模型 |
| 我们当前产品 | `workspace / thread / run / artifact / approval` | SQLite | 基础已经不错，但还偏轻 |

### 6.1 使用建议

- 问“桌面应用如何编排 agent 会话和远程桥接”时，看 `Proma`
- 问“桌面产品如何后端化 provider 和会话”时，看 `CodePilot`
- 问“多入口消息怎么统一到一个运行时”时，看 `AionUi`
- 问“生产级 agent loop 怎么做”时，看 `Claude Code`
- 问“durable thread protocol 怎么设计”时，看 `Codex`
- 问“聊天对象应该挂到什么产品对象上”时，看 `Alma`

## 7. Workspace、Artifact、Prompt App 与产品对象模型

| 项目 | Workspace 模型 | Artifact 模型 | Prompt / App 中间层 | 对 AI OS 的价值 |
| --- | --- | --- | --- | --- |
| Proma | 工作区化 Agent 运行时 | 不是产品中心 | 没有强 Prompt App 对象层 | 学工作区化执行 |
| CodePilot | Assistant Workspace，带本地文件、记忆和检索 | 有，但不是产品中心 | 没有 Alma 式 Prompt App | 学 Assistant Workspace 和 Memory 绑定 |
| AionUi | 工作面很多，但对象模型不纯 | 输出散落在多个子系统 | 更偏 assistant/plugin，而不是 Prompt App | 学平台广度，不学对象纯度 |
| Claude Code | 项目上下文 + task/session 状态 | 工具输出和文件，不是 artifact-first UX | commands/skills/tasks，不是 Prompt App | 学运行时，不学产品对象 |
| Codex | thread/event 更强，workspace UX 不是主角 | 输出更像协议对象和文件 | app-server surface，不是 Prompt App | 学协议对象 |
| Alma | Workspace 很强 | Artifact 很强 | Prompt App 很强 | 这是 AI OS 产品对象骨架的主参考 |
| 我们当前产品 | Workspace / Thread / Run / Artifact / Capability / Recipe 已经有了 | 比较清楚但还轻 | Forge Recipe 已有，但 Prompt App 还未正式化 | 是一个很好的起点 |

## 8. MCP、Skills、Plugins 与 Capability Layer

| 项目 | MCP | Skills | Plugins / Extensions | 最值得学的价值 |
| --- | --- | --- | --- | --- |
| Proma | 主要是工作区 MCP 配置喂给 Agent 运行时 | 默认 skill bundle 很实用 | 插件不是重点 | 学本地 skills 打包与落地 |
| CodePilot | MCP loading / connection / adaptation 很强 | 技能发现、管理、市场化都比较成熟 | Plugin 与 MCP 双管理 | 学 runtime governance 和 skill discovery |
| AionUi | MCP + ACP + extension contribution 很强 | Skills 和 assistants 是平台资源 | 扩展系统很强 | 学广义能力平台 |
| Claude Code | MCP 深度进入工具系统 | Skills 是长期状态与工作流单元 | Hooks 与 plugin-like extension 很关键 | 学工具协议和 skills 心智 |
| Codex | MCP client 和 server 都是一等对象 | Skills、plugins、connectors 都存在 | plugin 系统很完整 | 学协议优先的 capability architecture |
| Alma | MCP、plugins、skills 都在本地控制平面里 | Skills 是产品能力系统的一部分 | 本地 plugin 模型很厚 | 学 capability system 如何变成产品面 |
| 我们当前产品 | Capability 与 Forge 已经存在，但 MCP 还轻 | skills 还没正式化 | 没有广义 extension system | 仍是早期形态 |

## 9. Remote Bridge、Team 与 Automation 对比

| 项目 | Remote Bridge | Team / Multi-Agent | Automation / Cron / Heartbeat | 最值得学的价值 |
| --- | --- | --- | --- | --- |
| Proma | 飞书 / 钉钉 / 微信桥接很强 | Agent Teams 已经存在 | 自动化比 AionUi / Alma 轻 | 学实用型 agent remote bridge |
| CodePilot | IM bridge 成熟 | Team 不如 AionUi 强 | task scheduler + heartbeat 已有 | 学 bridge 与 memory/task 协同 |
| AionUi | 频道和 plugin bridge 很强 | team/mailbox/MCP 协调很强 | cron 也强 | 学平台型自动化与协作 |
| Claude Code | remote/background session 能力很强 | task runtime 和 multi-agent 很强 | 长期运行态设计成熟 | 学 runtime 级任务与权限 |
| Codex | multi-agent 和 remote-like surface 都强 | spawn/wait/send/close 语义很清楚 | automation UI 不算产品重点 | 学正式 multi-agent protocol |
| Alma | 外部桥接和 browser relay 都有 | agent crew / mission 有 | heartbeat / cron / fatigue 很强 | 学长期运行的本地 AI OS 模式 |
| 我们当前产品 | 只有基础 automation | 没有正式 multi-agent runtime | automations 已有，但 heartbeat 深度还轻 | 后续要继续长出来 |

## 10. 每个项目最适合作为什么参考

| AI OS 层 | 最优参考 | 原因 |
| --- | --- | --- |
| Provider governance | CodePilot | 最强的 provider catalog、resolver、doctor、模型映射 |
| Executor protocol | Codex | 最强的 protocol-first app-server 和 event model |
| Query loop / tool orchestration | Claude Code | 最强的 controlled tool-loop agent runtime |
| Workspace-scoped agent execution | Proma | 应用层工作区化 agent 编排最直接 |
| 产品对象模型 | Alma | `Thread -> Workspace -> Artifact -> Prompt App` 最完整 |
| Channel / extension / ACP 平台 | AionUi | 最强的宽平台 agent hub 和 channel integration |
| Skills packaging | Proma + Claude Code | Proma 偏实用，Claude Code 偏协议心智 |
| Memory retrieval | CodePilot + Claude Code | 一个偏产品可用，一个偏 runtime 严谨 |

## 11. 我们当前产品的基线

我们当前产品的优势：

- 产品边界清楚
- 本地优先结构干净
- 核心对象已经明确：
  - workspace
  - thread
  - run
  - artifact
  - approval
  - memory
  - capability
  - recipe
- provider 和 executor adapter 现在都比较薄，便于继续演化

我们当前产品的主要缺口：

- 没有 CodePilot 级别的 provider governance
- 没有 Codex 级别的 executor app-server / protocol
- 没有 Claude Code 级别的完整 query loop runtime
- 没有 Alma 级别的 workspace runtime 和 prompt-app 中层
- 没有 AionUi 级别的 channel / extension / ACP 平台
- 没有 Proma 级别的 remote bridge 成熟度

## 12. 最终结论

最重要的结论不是“哪个项目最强”，而是：

- `Proma` 最强在应用层编排和远程桥接
- `CodePilot` 最强在 provider 治理和 assistant workspace
- `AionUi` 最强在平台广度、ACP、extension、channel、team、cron
- `Claude Code` 最强在 query loop、工具系统、权限系统、task runtime
- `Codex` 最强在协议、app-server、sandbox、executor infrastructure
- `Alma` 最强在产品对象模型和本地 AI OS 控制平面

AI OS 不应该整体复制任何一个项目。

AI OS 应该做的是：

- 从 `Alma` 吸收产品对象层
- 从 `CodePilot` 吸收 provider governance
- 从 `Claude Code` 吸收 query loop 和 tool runtime
- 从 `Codex` 吸收 executor protocol 和 app-server thinking
- 从 `Proma` 吸收 orchestrator 与 remote bridge 思路
- 从 `AionUi` 吸收 ACP、extension、channel、team 的平台分层

但最终产品边界必须保持我们自己的样子：

- 本地优先
- `AI Space` 是使用面
- `AI Forge` 是创造面
- `Companion` 是统一对外入口
