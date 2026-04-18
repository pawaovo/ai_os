# V0.1 Monorepo Bootstrap Implementation Plan

## Purpose

This plan controls the current Trellis task:

```text
.trellis/tasks/04-18-v0-1-monorepo-bootstrap
```

It is intentionally narrower than the final AI OS vision. Completing this plan should produce a V0.1 Alpha foundation: an internally usable engineering skeleton that proves the core architecture direction, not the final product.

## Product Stage After This Plan

When all phases below are complete, the product should be at:

```text
V0.1 Alpha — runnable core architecture validation
```

Expected capabilities at that point:

- Normal chatbot conversation path exists.
- Custom model providers can be represented and called.
- OpenAI-compatible and Anthropic-compatible provider adapters exist.
- Codex and Claude Code are both first-class Code Executor targets.
- Code executor events can be normalized into AI OS Run/Event/Approval/Artifact concepts.
- A minimal Space shell can demonstrate the Space/Mission/Run/Artifact loop.

Not expected at that point:

- Final UI quality.
- Full AI Forge.
- Store / Registry / public marketplace.
- Full automation platform.
- Full Connector ecosystem.
- Cloud runtime.
- Team permissions.
- Complex multi-agent swarm.

## Planning Rule

Do not decide the next engineering step ad hoc. Continue phases in order unless the user explicitly changes the plan.

If a phase needs to change, explain:

1. Which phase changes.
2. Why the current plan is insufficient.
3. What the replacement phase produces.
4. What verification proves it.

## Phase 1: Monorepo Skeleton

Status: completed

Goal:

Create the first real product code workspace under `product/`.

Completed outputs:

- `product/package.json`
- `product/package-lock.json`
- `product/tsconfig.base.json`
- `product/tsconfig.json`
- `product/README.md`
- `product/.gitignore`
- `product/apps/space-desktop/`
- Initial package directories

Verification:

- `npm run typecheck`

## Phase 2: Kernel And Protocol Types

Status: completed

Goal:

Define the minimum shared language for V0.1.

Completed outputs:

- `packages/kernel/kernel-objects`
- `packages/kernel/kernel-events`
- `packages/conversation/conversation-core`
- `packages/model-providers/provider-protocol`
- `packages/executors/executor-protocol`

Verification:

- `npm run typecheck`

## Phase 3: Model Provider Adapters

Status: completed

Goal:

Prove custom provider adapters can be represented without binding to UI, secret storage, or global runtime state.

Completed outputs:

- `packages/model-providers/provider-openai-compatible`
- `packages/model-providers/provider-anthropic-compatible`
- Mock tests for model listing and SSE stream parsing

Verification:

- `npm test`

## Phase 4: Provider Registry

Status: completed

Goal:

Add a thin routing layer that dispatches provider calls by `ModelProviderConfig.protocol`.

Completed outputs:

- `packages/model-providers/provider-registry`
- Tests for protocol routing, duplicate protocol rejection, and missing protocol errors

Important boundary:

- The registry is not a secret manager.
- The registry is not a default provider selector.
- The registry is not a model router.
- The registry must not import concrete provider adapters directly.

Verification:

- `npm test`

## Phase 5: Conversation Runtime

Status: completed

Goal:

Connect `conversation-core` and the model provider layer into the normal chatbot path.

Expected outputs:

```text
packages/conversation/conversation-runtime/
```

Minimum responsibility:

- Accept a `ChatRequest`.
- Accept `ModelProviderConfig`.
- Accept `ProviderRuntime`.
- Accept `ProviderRegistry`.
- Return an `AsyncIterable<ChatStreamEvent>`.

Suggested API shape:

```ts
streamConversation({
  registry,
  providerConfig,
  providerRuntime,
  chatRequest,
})
```

Non-goals:

- No UI.
- No database.
- No provider selection policy.
- No default model selection.
- No secret storage implementation.
- No real network smoke test.

Verification:

- Mock registry/runtime test proves `streamConversation` forwards to the provider layer.
- `npm test`

## Phase 6: Executor Event Mappers

Status: completed

Goal:

Prepare Codex and Claude Code executor adapters by mapping mock native events into AI OS kernel events.

Expected outputs:

- `executor-codex` mapper skeleton
- `executor-claude-code` mapper skeleton
- Tests for native-like mock event to `KernelEvent`

Non-goals:

- No real Codex process.
- No real Claude Code process.
- No UI.

Verification:

- Mock event mapping tests.
- `npm test`

## Phase 7: Control Plane Minimal

Status: next

Goal:

Create the first Mission/Run orchestration layer.

Expected outputs:

```text
packages/control/control-plane/
```

Minimum responsibility:

- Create Mission from user goal.
- Start Run through an executor.
- Consume `KernelEvent`.
- Attach Artifact to Run.
- Represent approval request/response.

Non-goals:

- No complex planning.
- No executor auto-routing.
- No multi-agent orchestration.

Verification:

- Mock executor produces `run.started -> run.stream -> artifact.created -> run.completed`.
- `npm test`

## Phase 8: Companion Core Minimal

Status: pending

Goal:

Create the minimal Companion entry layer.

Expected outputs:

```text
packages/companion/companion-core/
```

Minimum responsibility:

- Receive user goal.
- Call Control Plane.
- Explain mission/run status.

Important boundary:

- Companion must not call Executor directly.

Verification:

- Mock Control Plane test.
- `npm test`

## Phase 9: Workspace And Artifact Core

Status: pending

Goal:

Move workspace and artifact behavior beyond pure type definitions.

Expected outputs:

```text
packages/workspace/workspace-core/
packages/workspace/artifact-core/
```

Minimum responsibility:

- Create workspace references.
- Create artifact references.
- Link artifact to run and space.

Non-goals:

- No full database.
- No file sync.
- No preview renderer.

Verification:

- Unit tests for workspace/artifact reference creation.
- `npm test`

## Phase 10: Space Desktop Minimal

Status: pending

Goal:

Create the smallest product shell that can demonstrate the normal chat and Space loop.

Expected outputs:

```text
apps/space-desktop/
```

Minimum responsibility:

- Show a simple chat surface.
- Show run/artifact status in a simple panel or list.
- Provide enough structure to later evolve into canvas.

Non-goals:

- No polished design.
- No full infinite canvas.
- No multi-device support.

Verification:

- Build/typecheck.
- Manual smoke if a runnable shell exists.

## Phase 11: Real Codex And Claude Code Integration

Status: pending

Goal:

Replace mock executor assumptions with real adapter integration.

Expected outputs:

- `executor-codex` real integration path.
- `executor-claude-code` real integration path.
- Shared event normalization into `KernelEvent`.

Non-goals:

- No complex executor routing.
- No executor marketplace.
- No cloud executor pool.

Verification:

- One real Codex run can stream normalized events.
- One real Claude Code run can stream normalized events.
- Both can produce or reference an Artifact.

## Current Next Step

Proceed to Phase 7: Control Plane Minimal.
