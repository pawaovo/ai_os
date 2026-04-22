# Reference Project Comparison And Absorption Plan

## Phase 1

### Goal

Turn the reference-project research into an executable AI OS plan with real Trellis tasks.

### Deliverables

- Reference comparison document:
  - `ai_os/ai_os_docs/05-reference-project-comparison.md`
- Absorption and iteration plan:
  - `ai_os/ai_os_docs/06-reference-absorption-and-iteration-plan.md`
- Roadmap cross-reference update:
  - `ai_os/ai_os_docs/04-implementation-roadmap.md`
- P0 Trellis tasks:
  - `04-22-p0-provider-governance-foundation`
  - `04-22-p0-executor-app-server-event-foundation`
  - `04-22-p0-single-agent-query-loop-discipline`
  - `04-22-p0-memory-retrieval-integration`
  - `04-22-p0-vertical-integration-regression-baseline`

### Validation

- Verify the new docs exist and contain:
  - project-level comparison
  - module-level mapping
  - P0/P1/P2 breakdown
  - direct reuse vs adapted reuse boundaries
- Verify the roadmap doc links to the new docs.
- Verify the P0 task directories exist and include PRDs.

### Commit Policy

- Commit this planning phase as documentation and task scaffolding only.
- Do not claim product runtime validation for this phase because no product code changes are included.

## Phase 2

### P0 Task Queue

1. `P0 Provider Governance Foundation`
   - Primary reference: CodePilot
   - Secondary reference: AionUi
   - Parallelization: can run in parallel with query loop design work

2. `P0 Executor App Server Event Foundation`
   - Primary reference: Codex
   - Secondary reference: Claude Code
   - Parallelization: must stay aligned with query loop work; shared protocol decisions should be merged centrally

3. `P0 Single Agent Query Loop Discipline`
   - Primary reference: Claude Code
   - Secondary reference: Proma, CodePilot
   - Parallelization: can run in parallel with provider governance if boundaries remain clean

4. `P0 Memory Retrieval Integration`
   - Primary reference: CodePilot
   - Secondary reference: Claude Code
   - Parallelization: should follow the query loop contract, but its repository and retrieval work can develop in parallel

5. `P0 Vertical Integration And Regression Baseline`
   - Purpose: close the P0 loop and validate the representative end-to-end path
   - Parallelization: final integration only; must run after the other P0 tasks stabilize

### P0 Work Packages Inside Those Tasks

- `P0 Provider Governance Foundation`
  - `P0-01` Provider Registry 与 Protocol Detection
  - `P0-02` Provider Catalog / Model Alias / Structured Errors
  - `P0-03` Connection Doctor
- `P0 Executor App Server Event Foundation`
  - `P0-04` Executor Session / Run Protocol V2
  - `P0-05` Executor App-Server Boundary 与 Event Normalization
- `P0 Single Agent Query Loop Discipline`
  - `P0-06` 单 Agent Turn State Machine 与 Tool Orchestration
  - `P0-07` Permission Interception / Retry / Error Recovery
- `P0 Memory Retrieval Integration`
  - `P0-08` Memory Retrieval API 与 Ranking
  - `P0-09` Memory Injection 与 Memory-Use Tracing
- `P0 Vertical Integration And Regression Baseline`
  - `P0-10` 纵向联调与回归基线

## Phase 3

### Planned Next Backlog

- `P1 Workspace Runtime 对象与状态契约`
- `P1 Workspace 长任务状态与续接机制`
- `P1 Workspace-native Artifact / Preview / Terminal Surface`
- `P1 Prompt App 对象定义与输入输出契约`
- `P1 Recipe 到 Prompt App 的安装与运行桥`
- `P1 MCP Client 与 Config Sync 分层`
- `P1 Future MCP Server Boundary Spike`
- `P2 External Runtime Compatibility Contract`
- `P2 ACP / Agent Hub 最小接入骨架`
- `P2 Remote Bridge 身份、信任与审计契约`
- `P2 单一 Channel Pilot 与 Remote Session Continuation`
- `P2 Multi-agent Coordination Contract 与 Mailbox`
- `P2 Multi-agent Product Surface 与 Governance`

## Dependency Rules

- `Provider Governance` and `Single Agent Query Loop` can be designed in parallel.
- `Executor App Server Event Foundation` must publish a stable protocol before broad executor expansion.
- `Memory Retrieval` should not redefine message or run state independently from the query loop work.
- `Workspace Runtime Deepening` should not start until executor and query-loop boundaries are clearer.
- `Prompt App` should follow the workspace runtime contract, not grow as an isolated Forge-only feature.
- `ACP / Agent Hub` should not begin before executor compatibility boundaries are clear.
- `Remote Bridge` should not begin before identity, approval, and audit requirements are written down.

## Stop Rules

- Do not start ACP, channel bridge, or team-productization work before the P0 foundations are stable.
- Do not widen provider support faster than the governance layer can validate and diagnose it.
- Do not evolve Prompt App as a detached feature; it must remain aligned with Forge and capability design.
