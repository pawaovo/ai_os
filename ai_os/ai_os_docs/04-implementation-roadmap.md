# AI OS Implementation Roadmap

## 1. Purpose

This document defines how AI OS should move from the current V0.1 Product Preview to V1.0.

It is not a vision document. The vision is already covered by:

- `00-ai-os-overview.md`
- `01-ai-space.md`
- `02-ai-forge.md`
- `03-capability-layer-principles.md`

Companion reference documents for execution strategy:

- `05-reference-project-comparison.md`
- `06-reference-absorption-and-iteration-plan.md`

This document is the execution map:

- what each version should deliver
- what the user can actually test after each version
- which tasks belong to each version
- which technology choices should be used
- which tasks can run in parallel
- which tasks must stay sequential

Important:

- `P0 / P1 / P2` in `06-reference-absorption-and-iteration-plan.md` mean reference-absorption priority only.
- They do not replace the product release sequence in this document.
- Delivery order still follows `V0.1 -> ... -> V1.0`.

## 2. Current State

The current product stage is:

```text
V0.1 Product Preview
```

It is a clickable local macOS app and a working architecture preview. It is not yet a complete personal AI OS.

### 2.1 Current V0.1 Capabilities

The current V0.1 app can:

- open as `product/build/AI OS.app`
- render a native macOS WebKit window
- start a local Node server internally
- configure an OpenAI-compatible or Anthropic-compatible model provider
- save provider name, protocol, base URL, API key, and model locally
- send real chat requests through the configured provider
- keep chat messages in the current app session
- run the deterministic mock executor path
- call Codex through the local CLI adapter
- call Claude Code through the local CLI adapter
- show run status, event stream, and artifact preview
- package as a local unsigned `.app`

### 2.2 Current V0.1 Limits

The current V0.1 app does not yet provide:

- Keychain-backed credential storage
- persistent threads
- persistent chat history
- multiple Spaces
- workspace picker
- durable artifact storage
- approval UI
- real executor run cancellation from UI
- long-running task management
- automation
- proactive messages
- local memory
- Forge
- signed or notarized installer
- `.dmg` distribution
- embedded Node runtime

### 2.3 Current V0.1 Meaning

V0.1 proves that AI OS can exist as a local app with:

```text
Companion entry
-> Model Provider chat
-> Control Plane
-> Code Executor Protocol
-> Codex / Claude Code adapters
-> Kernel Events
-> Artifact preview
```

It does not yet prove that AI OS can be used as a long-term daily assistant.

## 3. Version Principles

### 3.1 Product Principle

Every version must produce a user-visible improvement. Avoid versions that only say "refactor runtime" or "add database" without a visible product outcome.

### 3.2 Architecture Principle

No external SDK should define the AI OS core.

The core remains:

```text
Kernel Objects
Provider Protocol
Executor Protocol
Control Plane
Events
Artifacts
Approvals
```

External SDKs and CLIs are adapters. They can be replaced.

### 3.3 Local-First Principle

Default data placement:

- app state: local storage
- credentials: Keychain or equivalent secret store after V0.2
- workspace data: user-selected local directories
- artifacts: local files or local managed store
- run/event history: local database
- cloud: opt-in only

### 3.4 Stage Principle

Do not pull future-stage capabilities into earlier versions unless they are required for a user-visible acceptance criterion.

## 4. Technology Strategy

### 4.1 Decision Summary

The optimal design is not "use OpenAI SDK" or "use Claude SDK" or "use pi SDK" as the system foundation.

The optimal design is:

```text
AI OS core protocols
-> provider adapters
-> executor adapters
-> optional runtime/agent libraries
```

Recommended choices:

| Area | Recommended Choice | Why |
|---|---|---|
| AI OS core | Own TypeScript protocols | Prevent vendor lock-in and keep Space/Run/Event/Artifact stable |
| Model provider calls | Own Provider Protocol with OpenAI-compatible and Anthropic-compatible adapters | Required for custom base URL and user-supplied API keys |
| Direct OpenAI support | OpenAI official SDK or typed Responses adapter after V0.2 hardening | Best for first-party OpenAI features, but not enough for all custom providers |
| Direct Anthropic support | Anthropic official SDK or typed Messages adapter after V0.2 hardening | Best for first-party Anthropic features, but not enough for all custom providers |
| Custom provider / relay support | Keep HTTP adapters | Most user relay services are protocol-compatible but not SDK-perfect |
| Coding execution | Codex and Claude Code through `CodeExecutor` adapters | Coding is execution, not normal model completion |
| Codex integration | V0.1/V0.2 CLI adapter; V0.4 evaluate Codex app-server JSON-RPC | CLI works now; app-server is likely better for durable run/session integration |
| Claude Code integration | V0.1/V0.2 CLI adapter; V0.4 evaluate Claude Code SDK if stable for embedding | CLI works as product baseline; SDK can improve integration if it preserves our protocol boundary |
| Pi SDK / pi-agent-core | Reference and optional future runtime layer, not immediate dependency | Strong ideas for unified provider/runtime/session, but adopting it as core now would overfit too early |
| OpenAI Agents SDK | Optional future orchestration reference, not Space core | Useful for agent/tool patterns, but AI OS needs local-first Control Plane and executor governance |

### 4.2 Provider Layer Strategy

Provider layer answers:

```text
Which model thinks and generates?
```

It should support:

- OpenAI-compatible providers
- Anthropic-compatible providers
- user-defined API base URL
- user-defined API key
- model selection
- connection testing
- error diagnosis

V0.1 uses custom HTTP adapters. This is correct for product preview because custom relay services are a first-class requirement.

V0.2 should harden this layer:

- Keychain storage
- Provider Doctor
- model list loading
- clear provider error taxonomy

Official SDKs may be added behind the same Provider Protocol, but they must not replace the protocol.

### 4.3 Executor Layer Strategy

Executor layer answers:

```text
Which execution environment performs the task?
```

Executors include:

- Codex
- Claude Code
- browser automation
- shell / CLI
- future remote workers

Codex and Claude Code should not be treated as normal chat model providers. They are coding executors.

The stable internal chain remains:

```text
Companion
-> Control Plane
-> Code Executor Protocol
-> Executor Adapter
```

V0.1 already proves this chain.

V0.4 should turn it into a product-grade workflow:

- real streaming run output
- cancellation
- approval UI
- artifact extraction
- workspace-safe execution
- error diagnosis

### 4.4 SDK Selection Rules

Use an external SDK only if it improves a specific adapter without leaking into core.

Acceptable:

- `provider-openai-sdk` implements `ModelProvider`
- `provider-anthropic-sdk` implements `ModelProvider`
- `executor-claude-code-sdk` implements `CodeExecutor`
- `executor-codex-app-server` implements `CodeExecutor`

Not acceptable:

- UI imports OpenAI SDK directly
- UI imports Claude SDK directly
- Companion calls Codex or Claude Code directly
- Control Plane depends on vendor-native event formats
- Agent memory or artifact semantics follow a vendor SDK object model

### 4.5 Pi SDK Position

`pi-mono` is valuable as a reference for:

- unified provider interface
- tool-capable model catalog
- agent state
- context serialization
- cross-provider handoff
- RPC / SDK embedding
- extension and skill packaging
- terminal agent UX

However, AI OS should not adopt Pi as the kernel in V0.2.

Reason:

- AI OS needs Space, Workspace, Run, Artifact, Approval, Automation, and Forge as first-class objects.
- Pi is optimized around coding-agent/runtime abstractions.
- Direct adoption too early could force AI OS into a coding-agent shape instead of a personal AI OS shape.

Recommended path:

- V0.2: keep our own Provider Protocol and direct adapters.
- V0.3/V0.4: borrow Pi patterns for model catalog, session context, and agent event streaming.
- V0.7: evaluate Pi-style extension/package mechanisms for capability system.
- V0.8: evaluate Pi-style SDK embedding for Forge-generated capabilities.

### 4.6 Best Current Technical Stack

For near-term product development:

| Layer | V0.2 Recommendation |
|---|---|
| App shell | Current macOS WebKit shell, keep lightweight |
| Server runtime | Node TypeScript local server |
| UI | Keep framework-free until UI complexity justifies React/Svelte |
| Provider calls | Current Provider Protocol + HTTP adapters |
| Credentials | macOS Keychain for API keys |
| Local data | SQLite for threads, messages, runs, artifacts |
| Executor | Codex / Claude Code CLI adapters |
| Events | Current KernelEvent subset, stored locally |
| Tests | Node test runner and mock provider/executor fixtures |

Do not introduce Electron, Tauri, or a large UI framework until the product shape requires it.

## 5. V0.1 Product Preview

### 5.1 Status

Completed.

### 5.2 User-Visible Result

User can:

- open `AI OS.app`
- configure a model provider
- send real chat messages
- run mock executor task
- run Codex local CLI task
- run Claude Code local CLI task when the configured service is available
- see run status, event stream, and artifact preview

### 5.3 Engineering Outputs

- product monorepo
- kernel objects
- kernel events
- provider protocol
- OpenAI-compatible adapter
- Anthropic-compatible adapter
- provider registry
- conversation runtime
- executor protocol
- Codex executor adapter
- Claude Code executor adapter
- control plane
- companion core
- workspace/artifact core
- Space Desktop product preview
- macOS `.app` packaging

### 5.4 Known Limits

- provider API key stored in local JSON
- chat history is session-local
- no thread list
- no persisted run history
- no workspace picker
- no approval UI
- unsigned app
- Node must exist on machine

## 6. V0.2 Secure Chat Assistant

### 6.1 Goal

Make AI OS usable as a daily local chat assistant with safe provider configuration and persistent chat history.

### 6.2 User-Visible Result

User can:

- open the app
- add/edit/delete providers
- test provider connection
- select provider and model
- create multiple chat threads
- continue previous conversations after app restart
- see provider errors in clear language

### 6.3 Tasks

- Move API keys from JSON to macOS Keychain.
- Keep provider metadata in local database.
- Add Provider Doctor:
  - test base URL
  - test API key
  - list models
  - validate selected model
  - show protocol-specific errors
- Add SQLite local store:
  - providers
  - threads
  - messages
  - app settings
- Add thread list.
- Add new thread / rename thread / delete thread.
- Add model selector.
- Improve chat streaming display.
- Add empty/error/loading states.

### 6.4 Non-Goals

- no workspace file execution
- no automation
- no Forge
- no cloud sync
- no team features

### 6.5 Acceptance Criteria

- API keys are not stored in plain text JSON.
- App restart preserves provider list.
- App restart preserves chat threads and messages.
- User can send real chat through selected provider/model.
- Provider Doctor identifies invalid key, invalid URL, and invalid model.
- Tests cover provider persistence and thread/message persistence.

### 6.6 Parallelization

Can run in parallel:

- Provider Doctor UI
- SQLite schema and repository layer
- chat thread UI
- model selector

Must be sequential:

- define storage schema before thread UI depends on it
- define Keychain contract before provider settings stores keys
- define provider error taxonomy before polished error UI

## 7. V0.3 Workspace-Aware Assistant

### 7.1 Goal

Make AI OS understand and operate around a selected local workspace.

### 7.2 User-Visible Result

User can:

- choose a local project/workspace folder
- see active workspace in the app
- ask questions about workspace context
- create artifacts from chat or runs
- save artifacts locally
- reopen artifact history

### 7.3 Tasks

- workspace picker
- workspace metadata persistence
- workspace-scoped threads
- artifact persistence
- artifact preview panel
- run history store
- file reference object model
- local-first artifact placement rules

### 7.4 Non-Goals

- no full IDE
- no cloud workspace sync
- no team workspace sharing
- no complex file indexing engine yet

### 7.5 Acceptance Criteria

- User can select a local workspace.
- Threads can be associated with a workspace.
- Artifact can be saved and reopened.
- Run history survives app restart.
- User can distinguish chat output, run output, and saved artifact.

### 7.6 Parallelization

Can run in parallel:

- workspace picker UI
- artifact preview UI
- run history display

Must be sequential:

- workspace identity contract before workspace-scoped storage
- artifact storage contract before artifact preview
- run/event store before replay UI

## 8. V0.4 Code And Executor Workflow

### 8.1 Goal

Turn Codex and Claude Code from demo paths into usable coding executors inside AI OS.

### 8.2 User-Visible Result

User can:

- choose Codex or Claude Code
- run a coding task against a workspace
- see real-time output
- cancel a run
- see clear failure reason
- see generated artifacts
- see approval requests when risky actions are requested

### 8.3 Tasks

- executor availability doctor
- streaming executor output UI
- run cancellation
- executor timeout controls
- approval request model
- approval UI
- diff/file artifact preview
- workspace-safe execution policy
- Codex app-server JSON-RPC evaluation
- Claude Code SDK/embedding evaluation

### 8.4 Technology Decision

Continue using CLI adapters until product needs exceed them.

Evaluate:

- Codex app-server JSON-RPC for richer thread/turn/item integration
- Claude Code SDK for managed execution and permission hooks

Adopt either only behind `CodeExecutor`.

### 8.5 Non-Goals

- no multi-executor swarm
- no executor marketplace
- no remote executor pool
- no automatic code modification without approval

### 8.6 Acceptance Criteria

- Codex can run a real workspace task.
- Claude Code can run a real workspace task when its provider is available.
- User can cancel a run.
- Approval request can pause execution.
- User can grant/reject approval in UI.
- Artifacts show changed files, reports, or transcript.

## 9. V0.5 Approval And Trust

### 9.1 Goal

Make risky actions visible, interruptible, and auditable.

### 9.2 User-Visible Result

User can:

- see why an action needs approval
- approve or reject it
- see approval history
- configure default trust behavior for local workspace actions

### 9.3 Tasks

- approval-core package
- approval policy engine
- approval UI
- approval history
- risk categories
- trusted workspace rules
- command/file/network approval mapping

### 9.4 Non-Goals

- no enterprise permission model
- no team approval workflow
- no public trust marketplace

### 9.5 Acceptance Criteria

- File mutation can trigger approval.
- Shell/network action can trigger approval.
- User decision is recorded.
- Rejected approval stops or fails the run clearly.

## 10. V0.6 Automation And Proactive Assistant

### 10.1 Goal

Make AI OS proactive without making it unsafe.

### 10.2 User-Visible Result

User can:

- create one-off reminders
- create scheduled tasks
- create heartbeat follow-ups
- pause or delete automation
- see automation run history
- approve risky automation actions

### 10.3 Tasks

- automation object
- local scheduler
- heartbeat runner
- automation UI
- notification surface
- background run store
- approval integration

### 10.4 Non-Goals

- no cloud scheduler
- no enterprise workflow engine
- no unattended external sends by default

### 10.5 Acceptance Criteria

- Scheduled task runs locally.
- User can pause/delete task.
- Automation result appears in app.
- Risky action requires approval.

## 11. V0.7 Local Memory And Personal Context

### 11.1 Goal

Let AI OS remember useful personal and project context locally.

### 11.2 User-Visible Result

User can:

- save facts or preferences
- inspect saved memories
- delete memories
- see when memory was used
- benefit from memory in chat and tasks

### 11.3 Tasks

- memory object
- local memory store
- memory retrieval
- memory management UI
- memory injection into chat/executor tasks
- delete/forget path
- sensitivity labels

### 11.4 Non-Goals

- no model training
- no cloud memory sync
- no organization knowledge base

### 11.5 Acceptance Criteria

- User can add a memory.
- User can delete a memory.
- Chat can use relevant memory.
- App shows memory usage when applicable.

## 12. V0.8 Capability System

### 12.1 Goal

Make AI OS extensible without turning it into a plugin free-for-all.

### 12.2 User-Visible Result

User can:

- view installed capabilities
- enable/disable capabilities
- inspect permissions
- run a simple local capability
- see capability execution history

### 12.3 Tasks

- capability contract
- local capability registry
- capability execution wrapper
- permission declaration
- capability settings UI
- capability run events

### 12.4 Technology Decision

Use Pi-style extension/package ideas as reference, but keep our own Capability Contract.

Do not expose arbitrary third-party code execution before approval and trust layers are mature.

### 12.5 Acceptance Criteria

- App can register a local capability.
- Capability declares permissions.
- User can enable/disable it.
- Capability execution creates run/events/artifacts.

## 13. V0.9 AI Forge Preview

### 13.1 Goal

Let users turn successful workflows into reusable local capabilities.

### 13.2 User-Visible Result

User can:

- select a successful run
- convert it into a reusable recipe
- edit prompt, inputs, and outputs
- test the recipe
- save it as a local capability

### 13.3 Tasks

- recipe object
- prompt app minimal model
- Forge preview UI
- validation run
- local capability export
- replay from previous run

### 13.4 Non-Goals

- no public marketplace
- no monetization
- no organization templates
- no community governance

### 13.5 Acceptance Criteria

- User can create a recipe from a run.
- User can edit recipe fields.
- User can test recipe.
- Recipe can be saved and rerun locally.

## 14. V1.0 Personal AI OS

### 14.1 Goal

Deliver a local-first personal AI OS that can be used as a main daily assistant.

### 14.2 User-Visible Result

User can:

- chat daily
- use custom providers and models
- work with local workspaces
- run code tasks through Codex and Claude Code
- manage artifacts
- use approval and trust controls
- schedule automations
- use local memory
- create and reuse capabilities
- open a stable desktop app

### 14.3 Requirements

- local-first data ownership
- secure credential storage
- persistent threads
- persistent runs/events/artifacts
- workspace-aware execution
- approval UI
- automation UI
- memory UI
- capability system
- Forge preview
- signed/notarized macOS build or documented local install path

### 14.4 Non-Goals

V1.0 still does not need:

- full enterprise team permissions
- public marketplace
- large-scale cloud runtime
- multi-user organization administration
- complex swarm orchestration

## 15. Parallelization Plan

### 15.1 Safe Parallel Work

These can usually run in parallel:

- UI surface polish
- provider doctor UI
- storage repository tests
- artifact preview UI
- executor status UI
- documentation
- package/build scripts

### 15.2 Sequential Work

These should not run in parallel without explicit interface contracts:

- storage schema and UI depending on it
- approval policy and executor run flow
- workspace identity and artifact storage
- provider error taxonomy and error UI
- capability contract and Forge UI

### 15.3 Trellis Rule

Every future Trellis task should state:

- target version
- user-visible outcome
- affected packages
- acceptance criteria
- explicit non-goals
- whether it can run in parallel

## 16. Next Recommended Tasks

The next product task should be:

```text
V0.2 Secure Provider And Persistent Chat
```

Recommended scope:

- Keychain-backed provider secrets
- SQLite or equivalent local store
- provider metadata persistence
- thread/message persistence
- provider doctor
- model selector

This is the highest-impact next step because it turns the current preview into a daily usable local chat assistant.

After that:

```text
V0.3 Workspace And Artifact Persistence
V0.4 Executor Workflow And Approval UI
```

Do not start Forge, automation, or capability marketplace before V0.2 and V0.3 are stable.
