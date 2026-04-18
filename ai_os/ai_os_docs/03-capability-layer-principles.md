# 能力层设计原则

## 1. 文档目的

这份文档专门定义我们系统中的“能力层”。

它回答下面这些问题：

- 什么属于产品层
- 什么属于能力层
- 什么属于执行层
- 为什么我们不能只做一堆功能，而要做一个 Agent 可编程环境
- 为什么能力最终还要进入 App / Store 体系
- `opencli`、`web-access`、`CLI-Anything` 这类项目对我们的真正启发是什么

一句话概括：

**产品层解决“用户怎么使用系统”，能力层解决“系统怎么不断长出新能力，并把能力变成可运行、可分发的平台资产”。**

---

## 2. 三层结构

### 2.1 产品层

这是用户直接看到和操作的层。  
包括：

- `AI Space`
- `AI Forge`
- 最终 `AI OS`

这一层强调：

- 空间
- 交互
- 任务
- 结果
- 可视化
- 多端体验

### 2.2 能力层

这是系统真正的“可编程环境”层。  
包括：

- App
- Skill
- Recipe
- Connector
- Automation Template
- Agent Pack

这一层强调：

- 可组合
- 可沉淀
- 可修复
- 可验证
- 可发布

而且这层最终不只是给 Agent 调用，也要给产品表层使用。  
也就是说：

- 某个能力可以在 Space 中以 App Surface 直接渲染
- 某个能力可以在 Forge 中被编辑和验证
- 某个能力可以在 Store 中被安装和分发

### 2.3 执行层

这是底层具体如何把能力做出来。  
包括：

- API
- CLI
- 浏览器扩展
- CDP
- MCP
- 本地文件系统
- Electron app control
- 终端 / shell
- 外部专用执行器

这一层强调：

- 稳定
- 可调用
- 可适配
- 可诊断

---

## 3. 为什么能力层必须存在

如果没有能力层，系统最终只会变成：

- 一个大聊天工具
- 一堆功能按钮
- 一堆彼此割裂的模块

能力层存在的意义是：

- 让一次性操作变成长期能力
- 让能力可以复用
- 让能力可以组合
- 让能力可以修复
- 让能力可以进入市场与生态

---

## 4. 能力层的核心哲学

### 4.1 给 Agent 一个环境，而不是一堆工具

这是从 `OpenCLI: Emacs for Agents` 中得到的关键启发。

我们不应该只给 Agent 很多零散工具，而应该给它一个统一环境，让它可以：

- 发现能力
- 调用能力
- 组合能力
- 修复能力
- 沉淀能力

### 4.1.1 AI-friendly

能力层必须天然对 AI 友好。  
这意味着：

- 对象尽量结构化
- 状态和事件可机器读取
- 权限与边界清楚
- 执行结果能回放和诊断
- 能力契约稳定且可组合

如果 AI 不能稳定理解系统对象和能力契约，系统就只是“人类界面友好”，还不是真正的 AI-friendly。

### 4.1.2 Iterative-friendly / 渐进友好

这里的 `Iterative-friendly / 渐进友好` 指的是：

- 允许人和 AI 渐进式逼近目标
- 允许边做边修、边试边推进
- 支持中途插话、局部修改、局部重跑、局部验证、审批后继续
- 支持把临时成功路径逐步收紧为正式能力

能力层不应该要求“一开始就把所有步骤定义完”，而应允许逐步收敛。

### 4.1.3 Human-friendly

能力层虽然服务 AI，但最终也必须对人类友好。  
这意味着：

- 作者能看懂能力在做什么
- 用户能看懂能力会访问什么、会输出什么
- 能力不是一堆神秘脚本和参数
- 复杂性尽量通过 Prompt App、App Surface、Trust Report 和统一对象层被收敛

### 4.2 能力应小而可组合

不要一开始都是大而封闭的“超级能力”。  
更好的做法是：

- 浏览器读取
- 浏览器点击
- 搜索
- 提取
- 改写
- 发布
- 验证

这些小能力再组合成更高层的 App / Recipe。

### 4.2.1 统一对象层优先于能力堆砌

能力层最终不能直接围着“某个平台原始字段”工作，而要尽量围绕统一对象层工作。  
建议长期收敛为：

- Message
- Document
- File
- Task
- Event
- Person
- Artifact
- Action

外部平台再复杂，也应先通过 Connector 映射到对象层，再进入能力层。

### 4.3 能力应从真实使用中长出来

理想路径是：

1. 用户在 `AI Space` 中完成任务
2. 从任务区或节点区提取流程
3. 在 `AI Forge` 中抽象成能力
4. 验证并发布

### 4.4 能力必须可验证

能力不是 prompt。  
它必须能回答：

- 跑通了吗
- 成功率如何
- 哪些步骤会失败
- 哪些地方需要审批
- 风险等级是什么

对成品 App 来说，还必须进一步验证：

- UI Surface 是否正常
- Connector 是否可用
- 自动化是否可持续运行
- 行为是否可回放

### 4.5 能力必须可修复

能力不应该是黑盒。  
理想状态是：

- 能力配置可读
- 失败上下文可诊断
- 能力逻辑可更新
- 更新后可立即验证

### 4.6 能力必须可进化

真正强的平台不是能力越来越多，而是能力越来越聪明。  
例如：

- 站点经验积累
- 工具选择策略积累
- 失败恢复路径积累
- 更优 Agent 分工积累
- 更优执行器选择积累

### 4.7 不要把执行器当成产品本体

很多强系统都有自己的强执行器。  
但对我们来说，更重要的是：

- 把执行器接进来
- 让它们服从统一编排
- 让结果回到统一空间
- 保持执行器可替换

在 `Code` 这一层，尤其应该坚持：

- 优先直接接入 `Claude Code`、`Codex`
- 可以参考 Claude Agent SDK 一类接入方式
- 但平台内部只认我们自己的 `Code Executor` 协议
- 不让单一 SDK 或厂商格式成为能力层的硬依赖

### 4.8 能力最终要变成可安装的 App

很多能力的最终成品形态，不应该停在 Skill 或 Recipe。  
更成熟的结果应该是：

- 一个可安装 App
- 一个可展示页面
- 一个可配置场景

这样能力才真正进入平台化分发阶段。

### 4.9 事件驱动优先

能力层长期必须建立统一事件总线。  
例如：

- 新邮件到达
- 新任务创建
- 某 Artifact 生成
- 某审批通过
- 某 Agent 执行失败

这些事件会让：

- Automation Template
- Background App
- Trigger App
- Agent Runtime

形成真正的平台协作，而不是模块互相硬连。

---

## 5. 能力对象类型

### 5.1 App

面向普通用户的成品能力。  
它长期应支持多种形态：

- Panel App
- Background App
- Trigger App
- Flow App

### 5.2 Prompt App / Mini App

高频场景的轻应用能力。

### 5.3 Recipe

明确的流程能力。

### 5.4 Skill

偏知识、策略和经验的能力包。

### 5.5 Connector

连接外部世界的能力包。  
Connector 的职责不是只“连通”，而是：

- 认证
- 拉取数据
- 推送动作
- 统一映射为对象层

Connector 的接入优先级建议固定为：

1. 官方 API / SDK
2. CLI
3. Browser / Extension / Automation
4. 自研适配器
5. 等未来开放接口

### 5.6 Automation Template

面向持续运行的能力模板。

### 5.7 Agent Pack

角色化能力包。

### 5.8 Organization Template

可运行的组织模板。

### 5.9 Multi-Agent Capability

由多个 Agent 协同完成的能力。

### 5.10 App Contract

每个 App 都必须有标准契约。  
至少要声明：

- 处理哪些对象
- 依赖哪些 Connector
- 需要哪些权限
- 输入是什么
- 输出是什么
- UI Surface 是什么
- 是否支持后台运行
- 是否支持自动化触发
- 是否支持多 Agent 协作

### 5.11 Capability Contract 正式定义

长期看，所有正式能力都应收敛到统一的 `Capability Contract`。  
最低建议字段为：

- `id`
- `name`
- `goal`
- `type`
- `objectScope`
- `input`
- `output`
- `requiredConnectors`
- `requiredPermissions`
- `surface`
- `backgroundMode`
- `approvalPolicy`
- `executorPolicy`
- `artifactsProduced`
- `validationCases`
- `diagnostics`
- `repairPolicy`
- `runtimeCompatibility`
- `installStrategy`
- `updateStrategy`
- `sourceRegistry`
- `providerPolicy`
- `contextFilesPolicy`
- `version`
- `trustLevel`

这些字段的作用不是“把能力做成后台表单”，而是让：

- AI 能稳定理解它
- 人类能稳定审查它
- 平台能稳定验证和分发它

### 5.12 Executor Protocol 正式定义

在定义 Executor 之前，必须先区分 `Model Provider` 和 `Executor`：

- `Model Provider` 负责模型调用，例如 OpenAI-compatible、Anthropic-compatible、自定义 API URL、自定义 API Key 和模型列表
- `Executor` 负责执行任务，例如 Codex、Claude Code、Browser、CLI、Shell、Hermes、OpenCLI

普通 chatbot 对话主要调用 `Model Provider Layer`。  
代码任务、浏览器操作、终端操作和自动化任务主要调用 `Executor Layer`。  
两者可以协作，但不能混成一个概念。

不管底下接的是：

- `Claude Code`
- `openai/codex`
- `Hermes Agent`
- `OpenCLI`
- `web-access`
- CLI / API / Browser / FS
- ACP / remote agent / team agent

平台内部都应尽量只认统一的 `Executor Protocol`。  
最低建议字段为：

- `executorId`
- `executorType`
- `task`
- `workspace`
- `context`
- `streamEvents`
- `abort`
- `artifacts`
- `cost`
- `approvalRequests`
- `error`
- `diagnostics`
- `runtimeStatus`
- `providerStatus`
- `repairHints`
- `embeddingMode`
- `providerRouting`

其中：

- `executorType` 用于区分 `code`、`browser`、`api`、`cli`、`hybrid`
- `approvalRequests` 用于把高风险动作拉回统一审批层
- `diagnostics` 用于平台后续修复和社区维护
- `runtimeStatus` 用于暴露当前执行器是否可用、是否缺凭证、是否缺本地依赖
- `providerStatus` 用于区分 provider credential、transport、model catalog、runtime adapter 的不同故障
- `embeddingMode` 用于区分 CLI 子进程、RPC、SDK、in-process runtime 等不同嵌入方式
- `providerRouting` 用于记录 provider fallback、cache affinity、service tier 等策略

#### 5.12.1 V0.1 Code Executor 最小契约

V0.1 的目标不是完整执行器平台，而是验证 Codex 和 Claude Code 能通过同一协议被 Space 调度。

V0.1 至少要支持两个一等 Code Executor：

- `executor-codex`
- `executor-claude-code`

二者都必须实现同一个 `Code Executor Protocol`，不能让 UI、Companion 或 Control Plane 直接依赖它们的原生输出格式。

V0.1 最小能力：

- `startRun`
- `streamEvent`
- `requestApproval`
- `submitApproval`
- `interruptRun`
- `completeRun`
- `collectArtifacts`
- `getRuntimeStatus`

V0.1 最小字段：

- `executorId`
- `executorType`
- `task`
- `workspace`
- `context`
- `streamEvents`
- `approvalRequests`
- `artifacts`
- `error`
- `runtimeStatus`
- `abort`

暂不做：

- 多执行器自动路由
- 执行器市场
- 多执行器竞价或评分
- 多执行器 swarm
- 云端 executor pool

Codex app-server 可以作为协议设计的重要参考，  
Claude Code 必须作为同等级实际 coding executor 适配。  
系统内部稳定语言仍然只能是自己的 `Run / Event / Approval / Artifact`。

对 `openai/codex`，`Executor Protocol` 应额外吸收：

- `thread`
- `turn`
- `item`
- `sandboxPolicy`
- `approvalPolicy`
- `reviewTarget`
- `commandExec`
- `fsWatch`
- `threadFork`
- `threadRollback`

对 `Hermes Agent`，`Executor Protocol` 应额外吸收：

- `gatewayPlatform`
- `terminalBackend`
- `memoryProvider`
- `skillInvocation`
- `cronDelivery`
- `trajectoryCapture`

### 5.13 Event Bus 正式定义

能力层长期必须有统一 `Event Bus`。  
最低应稳定支持这些核心事件：

- `task.created`
- `task.updated`
- `task.blocked`
- `task.completed`
- `artifact.created`
- `artifact.updated`
- `run.started`
- `run.stream`
- `run.failed`
- `run.completed`
- `approval.requested`
- `approval.granted`
- `approval.rejected`
- `runtime.changed`
- `runtime.unavailable`
- `provider.missing_credentials`
- `connector.updated`
- `adapter.repair.started`
- `adapter.repair.completed`
- `adapter.repair.failed`
- `memory.prefetched`
- `memory.synced`
- `skill.created`
- `skill.updated`
- `gateway.message.received`
- `gateway.delivery.sent`
- `cron.triggered`
- `trajectory.captured`
- `app.installed`
- `app.updated`

这样做的目的不是形式统一，而是为了让：

- Companion
- AI Space
- AI Forge
- Background App
- Automation
- 社区能力

最终工作在同一条事件语言上。

### 5.14 Trust / Approval / Replay 正式定义

长期看，`Trust` 不能只是标签，  
而要成为能力层里的正式协议组件。

最低建议包括：

- `permissionScope`
- `riskLevel`
- `approvalPolicy`
- `auditLog`
- `replay`
- `verificationStatus`
- `compatibilityInfo`
- `publisherIdentity`

其中：

- `approvalPolicy` 解决“什么时候必须停下来问用户”
- `auditLog` 解决“系统到底做了什么”
- `replay` 解决“失败后如何复盘和修复”
- `verificationStatus` 解决“社区能力能不能被信任”

### 5.14.1 V1 信任与审批最小规则

第一版不需要完整 policy language，但必须有默认审批边界。  
所有 Executor、Connector、App 和 Automation 都应先服从同一组基础规则。

建议 V1 默认规则如下：

| 动作 | 默认策略 |
|---|---|
| 读取用户明确加入 Space 的文件 | 可自动执行，但必须留下可见记录 |
| 读取 Space / Workspace 外的本地文件 | 需要用户确认或显式授权目录 |
| 创建、修改、删除、移动本地文件 | 默认需要审批 |
| 执行 shell 命令 | 按风险分级；危险命令、安装命令、网络暴露命令默认审批 |
| 访问公开网页或搜索 | 可自动执行，但需要记录来源 |
| 使用用户浏览器登录态读取内容 | 需要说明使用登录态；涉及敏感站点时需要确认 |
| 对外发送消息、发帖、提交表单、发布内容 | 默认需要审批 |
| 调用付费 API 或高成本模型 | 达到预算阈值后需要审批 |
| 安装、更新、删除能力包或插件 | 默认需要审批 |
| 后台自动化触发外部写入或发送 | 默认需要审批 |

这组规则的目的不是限制能力，而是让第一版先有统一安全底线。  
后续可以在 `approvalPolicy` 中细化为更完整的权限、预算、来源和信任等级模型。

### 5.15 推荐仓库模块边界

为了让能力层真正面向未来社区，  
建议把“正式协议”“官方实现”“社区扩展”从仓库边界上就分开。

推荐原则如下：

#### 5.15.1 协议层

放在：

- `packages/kernel/*`
- `packages/capability/capability-contract/`
- `packages/executors/executor-protocol/`
- `packages/connectors/connector-protocol/`

特点：

- 变化慢
- 最稳定
- 是 AI、产品、社区共同依赖的底层语言

#### 5.15.2 官方实现层

放在：

- `packages/runtime/*`
- `packages/executors/*`
- `packages/connectors/*`
- `packages/capability/*`

特点：

- 是平台官方维护的实现
- 可以持续演进
- 但必须服从协议层

#### 5.15.3 社区资产层

放在：

- `community/official-apps/`
- `community/official-connectors/`
- `community/official-recipes/`
- `community/templates/`

未来进一步开放后，也可以扩展为：

- `community/community-apps/`
- `community/community-connectors/`
- `community/community-recipes/`

特点：

- 明确不是内核
- 可版本化、可验证、可回滚
- 对社区作者更清晰、更友好

#### 5.15.4 上游复用层

放在：

- `vendor/pi-mono/`
- `vendor/opencli/`
- `vendor/web-access/`

特点：

- 方便保留来源和协议信息
- 方便社区理解哪些是上游 fork，哪些是我们的正式内核
- 方便后续逐步吸收和重写

---

## 6. 能力层与产品层的关系

### 6.1 AI Space 调用能力层

用户感知到的是：

- 任务
- Agent
- 结果
- 小场景 / App 页面

系统内部真正调用的是：

- App
- Prompt App / Mini App
- Recipe
- Connector
- Automation Template
- Agent Pack
- Organization Template

### 6.2 AI Forge 构建能力层

`AI Forge` 不是简单后台，而是能力层的创作面。  
它负责：

- 从 Space 抽取真实流程
- 把流程变成能力
- 验证能力
- 发布能力

### 6.3 AI OS 统一两者

最终 `AI OS` 中：

- Space 是使用面
- Forge 是创造面
- Store 是分发面
- 能力层是底层运行环境

---

## 7. 执行层与能力层的关系

执行层负责“怎么做”，能力层负责“做什么”和“如何组合”。

例如：

- API 请求是执行层
- “读取小红书搜索结果”是能力层

- CDP 点击是执行层
- “发帖到某平台”是能力层

- 终端命令是执行层
- “读取仓库状态并生成修复建议”是能力层

- 自动化浏览器是执行层
- 用户真实浏览器 relay 也是执行层
- “读取用户当前浏览器中的网页上下文”是能力层

- `Claude Code` / `Codex` 这类 coding executor 是执行层
- “完成一个复杂代码任务并把结果回流到 Space”是能力层

同时还要看到：

- Mail / Gmail / Google Calendar / Drive / IM 平台原始数据是执行层输入
- 把它们映射成 Message / Event / Document / File 是 Connector + 对象层工作
- “邮件日报助手”“日历整理助手”这类成品才是能力层 / App 层

---

## 8. 对相关项目的定位

### 8.1 OpenCLI

启发：

- 给 Agent 一个环境，而不是一堆工具
- 网站 / Electron / CLI 的统一能力化
- 一次性操作如何沉淀成长期能力

### 8.2 web-access

启发：

- 浏览器 / 联网能力的策略化设计
- 登录态复用
- 站点经验积累
- 子 Agent 并行处理网页任务

### 8.3 CLI-Anything

启发：

- 任意软件能力都可以被包装为统一接口

这些项目更适合作为我们的能力层 / 执行层参考，而不是产品主形态参考。

### 8.4 现有项目吸收矩阵

为了避免“看了很多项目，但最后不知道怎么落”，能力层里建议直接按下面的矩阵吸收：

| 项目 | 主要层级 | 最该吸收的内容 | 我们怎么处理 |
|---|---|---|---|
| `OpenCLI` | 能力层 / 执行层 | `operate -> adapter -> stable CLI` 的沉淀路径 | 作为 `AI Forge` 的能力生产线 `[复用改造]` |
| `OpenCLI v1.7+` | 能力层 / 执行层 | self-repair、structured diagnostics、verified generate、JS adapter、browser 命令重命名 | 作为外部能力自修复和验证生成参考 `[复用改造]` |
| `web-access` | 执行层 | agent-agnostic skill、CDP proxy、登录态复用、站点经验、并行子 Agent 浏览 | 作为 Browser Connector 与站点经验系统来源 `[复用改造]` |
| `CLI-Anything` / `AnyClaw` | 能力层 | repo / install / update / uninstall / search / public registry / package manager | 作为 Capability Package Manager 和联邦 registry 参考 `[复用改造]` |
| `pi-mono` | runtime 层 | session、extension hook ABI、prompt/resource loader、tool runtime、RPC/SDK embedding、provider routing/cache policy | 作为前期 runtime 骨架和扩展协议参考 `[直接复用 + 复用改造]` |
| `CodePilot` | runtime / governance 层 | runtime abstraction、provider governance、permission broker、setup intercept、subagent 权限继承 | 作为 Executor Governance 与权限闭环参考 `[复用改造]` |
| `openai/codex` | code executor / protocol 层 | Rust CLI、app-server JSON-RPC、Thread/Turn/Item、sandbox/approval、review、command exec、fs watch、plugin/app/skill/MCP API | 作为 Code Executor Protocol 和 app-server embedding 重点参考 `[直接复用 + 自研适配]` |
| `Hermes Agent` | companion / gateway / learning 层 | closed learning loop、memory provider、skills self-improvement、gateway、cron、terminal backends、tool gateway、trajectory capture/compression | 作为 Companion Learning Loop、Gateway Runtime、Automation 和 Training Data 参考 `[复用改造]` |
| `AionUi` | desktop / protocol / companion 层 | ACP 2.0 模块化协议、桌宠状态机、内置技能管理、team/remote agent、cron/channel/plugin、技能市场 | 作为 Companion Presence、ACP Runtime、技能管理和多 Agent 协同参考 `[复用改造]` |
| `Claude Code` | 执行层 | 最强 coding executor | 直接挂到执行层，不重写 `[直接复用]` |
| `Alma` | 产品对象层 / 能力层 | prompt app、capability system、workspace / artifact 一等对象 | 吸收对象模型，不照搬壳子 `[复用改造]` |
| `Proma` | 控制层 | orchestrator、permission、bridge | 吸收到产品控制层，不把它当最终产品壳 `[复用改造]` |

### 8.5 前期统一原则

前期无论吸收哪个项目，都必须满足下面 4 条：

- 最终都要回到统一对象层
- 最终都要通过统一能力契约运行
- 执行器必须可替换，不能绑死在某个项目上
- 能力最终要能进入 `AI Space` 渲染、在 `AI Forge` 验证、在 Store 中分发

同时还必须补上第 5 条：

- 对社区贡献者要有清楚的贡献、验证、升级、回滚和信任分级路径

---

## 9. 能力成长路径

一次性操作  
-> Space 中稳定入口  
-> Prompt App / 可复用流程  
-> App Contract  
-> App / Agent Pack / Organization Template  
-> 能力验证  
-> Store 分发  
-> 运行反馈  
-> 能力迭代

这是能力层最重要的成长路径。

---

## 10. 最终一句话

**对我们来说，真正让 `AI OS` 有生命力的，不只是空间，不只是 Agent，而是下面这层：一个对 Agent 可编程、对能力可组合、对结果可验证、对系统可进化、对平台可分发的能力环境。**
