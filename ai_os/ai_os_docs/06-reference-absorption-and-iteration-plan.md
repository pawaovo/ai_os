# 06 参考吸收与迭代计划

## 1. 文档目的

这份文档把参考项目对比结果，翻译成 AI OS 的执行策略。

它回答四个问题：

- 现在该吸收什么
- 后面再吸收什么
- 哪些东西暂时明确不做
- 每个 AI OS 层应该主要参考谁

目标不是做“大而全参考搬运”，而是在不引入过度设计的前提下，把 AI OS 的深度真正拉起来。

重要说明：

- 这里的 `P0 / P1 / P2` 表示参考吸收优先级
- 它们不表示产品发版顺序
- 产品发版节奏仍以 `04-implementation-roadmap.md` 为准

## 2. 当前 AI OS 的总体策略

AI OS 仍然应该保持这些底线：

- 本地优先
- 产品对象驱动
- Executor Protocol 为核心
- Provider 不反向定义核心产品对象
- Approval / Trust 明确可见
- 能力分阶段增长

所以正确策略不是“选一个项目照抄”，而是：

- 在该吸收协议的地方吸收协议
- 在该吸收产品对象的地方吸收产品对象
- 不在当前阶段引入宽平台外延

## 3. 吸收规则

### 3.1 适合直接复用的

只有当参考项目本身就是更下层的系统能力，而不应该上浮来定义 AI OS 产品语义时，才适合直接复用。

当前可直接复用的目标：

- `Claude Code` 作为一等外部 coding executor
- `Codex` 作为一等外部 coding executor
- `Codex app-server` 的协议思想作为未来 executor/app-server 设计参考

### 3.2 适合复用改造的

当参考项目很强，但它的产品边界、平台假设或厂商中心化假设不适合 AI OS 时，应该复用改造，而不是直接照搬。

当前主要复用改造目标：

- `CodePilot` 的 provider governance
- `Alma` 的 workspace / artifact / prompt app 对象模型
- `Proma` 的 orchestrator 与 remote bridge 思路
- `AionUi` 的 ACP、extension、channel、team 分层
- `Claude Code` 的 query loop 与 tool orchestration

### 3.3 明确不该照搬的

不应该直接照搬：

- Claude Code 的超大命令面
- AionUi 的全量 channel / extension / 平台宽度
- Proma 的完整 remote bridge 产品野心
- Alma 的超重 main-process 控制平面
- CodePilot 的整个平台外延

AI OS 需要更清楚的产品边界。

## 4. P0：必须尽快吸收

这些是最高价值的下一阶段能力，因为它们会直接增强当前产品深度，而不会立刻把系统拖重。

### 4.1 Provider Governance 层

主参考：

- `CodePilot`

辅助参考：

- `AionUi`

要补什么：

- provider registry
- provider catalog
- 协议识别
- connection doctor
- 模型列表与模型 alias 处理
- 结构化 provider 错误

为什么现在就该做：

- 我们当前 provider 层刻意保持得很薄
- 用户已经明确有自定义 relay、自定义 base URL 的真实需求
- provider 诊断会直接提升产品可用性

对应 AI OS 层：

- `Provider Protocol`
- `AI Space -> Providers`

### 4.2 Executor App-Server 与 Event Model

主参考：

- `Codex`

辅助参考：

- `Claude Code`

要补什么：

- 更丰富的 run protocol
- 在合适的地方向 `thread / turn / item / event` 风格靠拢
- executor session 生命周期
- 面向 executor / thread 的未来 app-server 边界
- UI 与 executor-native 事件格式彻底隔离

为什么现在就该做：

- 这是长期真实 coding execution 的最强底座
- 我们已经有 `run / event`，因此不是推倒重来，而是往前演化

对应 AI OS 层：

- `Executor Protocol`
- `Control Plane`
- `Run/Event` persistence

### 4.3 单 Agent Query Loop 纪律

主参考：

- `Claude Code`

辅助参考：

- `Proma`
- `CodePilot`

要补什么：

- 更明确的 turn 生命周期
- 更清楚的 tool orchestration 边界
- 更清楚的 permission interception 点
- 更清楚的错误恢复与 retry site
- 从“请求处理器 + side effects”演进到“长期 session state”

为什么现在就该做：

- 这是提高 runtime 质量的最短路径
- executor adapter 之后，最自然的下一步就是把 agent loop 做扎实

对应 AI OS 层：

- `Companion`
- `Control Plane`
- `Tool orchestration`

### 4.4 从 Memory Dump 进化到 Memory Retrieval

主参考：

- `CodePilot`

辅助参考：

- `Claude Code`

要补什么：

- retrieval-oriented memory injection
- `recent / search / get` memory 操作
- 评分、时效、scope-aware 选择
- 在 chat/run 中可见的 memory-use tracing

为什么现在就该做：

- 我们已经有本地 memory record
- 下一步重点不是增加更多 memory 形态，而是选对该注入哪条 memory

对应 AI OS 层：

- `Memory`
- `Chat`
- `Runs`

## 5. P1：应该规划但不必立刻全做

这些能力很重要，但应该建立在 P0 基础已经更稳的前提上。

### 5.1 Workspace Runtime 加深

主参考：

- `Alma`

辅助参考：

- `CodePilot`

要补什么：

- 更强的 workspace runtime 身份
- 更丰富的 artifact handling
- preview 和 terminal 作为 workspace-native runtime surface
- 能跨更长任务流存在的 workspace-scoped state

对应 AI OS 层：

- `Workspace`
- `Artifact`
- `Run surfaces`

### 5.2 从 Forge Recipe 进化到 Prompt App 中间层

主参考：

- `Alma`

辅助参考：

- 我们当前 `AI Forge` recipe 流

要补什么：

- 正式的 `Prompt App` 或等价中间对象
- 可编辑输入 / 输出契约
- 绑定 workspace、tools、model、artifact policy 的 runtime 配置
- 从 `Recipe` 到可安装产品 surface 的桥

为什么值得做：

- 这是从 `Forge recipe` 走向“产品内可运行能力”的最自然路径

对应 AI OS 层：

- `AI Forge`
- `Capability Layer`

### 5.3 MCP 分层

主参考：

- `Codex`
- `CodePilot`

辅助参考：

- `AionUi`
- `Proma`

要补什么：

- MCP client layer
- MCP config sync layer
- 未来 MCP server layer
- 更清楚地区分 capability transport 和 product object model

## 6. P2：后期平台化扩展

这些方向很有价值，但不应该在当前阶段成为主干阻塞项。

### 6.1 ACP 与 Agent Hub

主参考：

- `AionUi`

意味着什么：

- 接入更多外部 agent runtime
- 为外部 coding agent 建更清楚的兼容层
- 未来把 `Codex / Claude Code / 其他 runtime` 统一纳入一套 compatibility layer

为什么后置：

- 平台广度只有在 executor protocol 更稳后才有价值

### 6.2 Remote Bridge 与 Channel Entry

主参考：

- `Proma`
- `AionUi`
- `CodePilot`

意味着什么：

- 把 AI Space 带入远程 IM 入口
- 支持远程 session continuation
- 支持移动端或后台触发任务

为什么后置：

- 这会显著扩大 trust、identity、auth、support 的复杂度
- 对 V1 本地优先助手质量不是刚需

### 6.3 Team 与 Multi-Agent Productization

主参考：

- `Claude Code`
- `AionUi`
- `Proma`

意味着什么：

- 正式 subagent runtime
- task-level agent coordination
- mailbox 或显式 inter-agent communication

为什么后置：

- 我们应该先把单 agent 和 executor runtime 做得足够扎实

## 7. 当前阶段明确不做

这些内容现在应该明确后置：

- 复刻 Claude Code 的超大命令面
- 复刻 AionUi 的全量 extension marketplace 与 channel matrix
- 复刻 Proma 的完整 remote bridge 产品范围
- 复刻 Alma 的超重 main-process 控制平面
- 一步复制 CodePilot 的整个平台宽度

## 8. 按 AI OS 层的推荐映射

| AI OS 层 | 主参考 | 次参考 | 动作 |
| --- | --- | --- | --- |
| Companion query loop | Claude Code | Proma | 复用改造 |
| Provider governance | CodePilot | AionUi | 复用改造 |
| Executor protocol | Codex | Claude Code | 复用改造 |
| Workspace object model | Alma | CodePilot | 复用改造 |
| Artifact system | Alma | 当前 AI Forge | 复用改造 |
| Prompt App 中层 | Alma | 当前 AI Forge | 复用改造 |
| Skills packaging | Proma | Claude Code | 复用改造 |
| MCP architecture | Codex | CodePilot | 复用改造 |
| Memory retrieval | CodePilot | Claude Code | 复用改造 |
| Automation / heartbeat | Alma | AionUi | 后置吸收 |
| Channel bridge | Proma | AionUi / CodePilot | 后置吸收 |
| Team / multi-agent | Claude Code | AionUi / Proma | 后置吸收 |
| 外部 coding executor | Claude Code / Codex | 无 | 直接复用，通过 adapter 接入 |

## 9. 实施顺序建议

推荐顺序如下：

1. Provider governance
2. 更丰富的 executor 和 event protocol
3. 更强的单 agent query loop
4. retrieval-oriented memory
5. workspace runtime 加深
6. 从 Forge 向 Prompt App 演化
7. MCP 分层
8. 更广的 ACP / external runtime hub
9. remote bridge
10. team 与 multi-agent productization

这个顺序是刻意设计的：

- 先增强可靠性和控制力
- 再增强对象深度
- 最后再增强平台宽度

### 9.1 吸收项与最早落地版本映射

| 吸收项 | 最早建议落地版本 | 主要阻塞依赖 | 主文档 |
| --- | --- | --- | --- |
| Provider governance | `V0.2` | 当前 provider 层需先收敛成 registry/catalog/doctor | `04` + `06` |
| Executor app-server / event model | `V0.4` | 需要 run/event 协议演化 | `03` + `04` + `06` |
| Single-agent query loop discipline | `V0.4` | 需要 executor/session 边界更清楚 | `03` + `04` + `06` |
| Memory retrieval | `V0.7` | 依赖 query loop 与 session/memory 边界 | `04` + `06` |
| Workspace runtime deepening | `V0.3` 起规划，`V0.4+` 落厚 | 依赖 executor/query-loop 边界更稳 | `01` + `04` + `06` |
| Prompt App evolution from Forge | `V0.9` 起规划，`V1+` 落产品层 | 依赖 Forge/Capability/Workspace 对象边界 | `02` + `03` + `04` + `06` |
| MCP layering | `V0.8` 起规划 | 依赖 capability 与 executor 边界清楚 | `03` + `04` + `06` |
| ACP / Agent hub | `V1+` | 依赖 executor compatibility contract | `04` + `06` |
| Remote bridge / channel entry | `V1+` | 依赖 trust / audit / identity 设计成熟 | `01` + `03` + `04` + `06` |
| Team / multi-agent productization | `V1+` | 依赖 single-agent runtime 稳定 | `01` + `03` + `04` + `06` |

## 10. 最终建议

AI OS 不应该变成：

- “Proma + 更多产品对象”
- “CodePilot + 更少 provider”
- “AionUi + 更少 channel”
- “Claude Code + 一个桌面壳”
- “Codex + 一个更漂亮的 UI”
- “Alma Lite”

AI OS 应该变成：

- 一个本地优先 AI Native Data OS
- 一个有清晰产品对象模型的系统
- 一个有强 executor 和 event protocol 的系统
- 一个按阶段长出 capability platform 的系统
- 一个以 Companion 为统一入口的系统

所以真正的策略应该是：

- 从 `Alma` 学产品对象层
- 从 `CodePilot` 学 provider governance
- 从 `Claude Code` 学 agent-loop 纪律
- 从 `Codex` 学 executor protocol
- 从 `Proma` 学 orchestrator 和 bridge 思路
- 从 `AionUi` 学 ACP、extension、channel、team 的平台分层

但最终产品边界必须保持是我们自己的。

## 11. 可执行任务清单概览

### 11.1 P0 可直接进入开发队列

- `P0 Provider Governance Foundation`
- `P0 Executor App Server Event Foundation`
- `P0 Single Agent Query Loop Discipline`
- `P0 Memory Retrieval Integration`

### 11.2 P1 作为后续 backlog

- `Workspace Runtime 对象与状态契约`
- `Workspace 长任务状态与续接机制`
- `Workspace-native Artifact / Preview / Terminal Surface`
- `Prompt App 对象定义与输入输出契约`
- `Recipe 到 Prompt App 的安装与运行桥`
- `MCP Client 与 Config Sync 分层`
- `Future MCP Server Boundary Spike`

### 11.3 P2 作为平台化后续 backlog

- `External Runtime Compatibility Contract`
- `ACP / Agent Hub 最小接入骨架`
- `Remote Bridge 身份、信任与审计契约`
- `单一 Channel Pilot 与 Remote Session Continuation`
- `Multi-agent Coordination Contract 与 Mailbox`
- `Multi-agent Product Surface 与 Governance`
