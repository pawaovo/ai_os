# P1 Workspace Long Run Continuation

## Goal

Make workspace-scoped run runtime state durable enough to survive app restart and support the first safe continuation path.

## Requirements

- Persist workspace-scoped run runtime checkpoints instead of relying only on in-memory live sessions.
- Keep the persisted checkpoint aligned with the existing live run contract:
  - `sessionId`
  - `currentTurn`
  - `queryLoop`
  - `items`
  - `pendingApproval`
  - `memoryUsage`
  - `memoryTrace`
- Support the first safe continuation path:
  - pre-run approval pending before executor start
- For other interrupted non-terminal paths, expose a clear continuation state instead of pretending the original live executor process can resume.
- Keep the first step additive and product-layer scoped.

## Scope Boundary

- In scope:
  - runtime checkpoint persistence
  - persisted live-run fallback
  - pre-run approval continuation after restart
  - continuation metadata for non-resumable interrupted paths
- Out of scope:
  - process-level executor resume
  - remote bridge resume
  - new executor-protocol fields
  - terminal embedding

## Dependencies

- Should build on `P1 Workspace Runtime Contract`.
- Should keep using the completed P0 live session and query-loop contracts.

## Acceptance Criteria

- [ ] AI OS persists workspace-scoped run runtime checkpoints.
- [ ] `/api/runs/:id/live` can fall back to persisted runtime state after restart.
- [ ] A run paused at pre-run approval can continue after restart.
- [ ] Non-resumable interrupted runtime states are explicit and test-covered.

## Suggested Validation

- Review against:
  - current workspace runtime summary contract
  - current live run session contract
- Verify the first continuation path remains local-first and workspace-scoped.

## Suggested Commit Boundary

- Persist runtime checkpoint first
- Rehydrate/fallback live view second
- Pre-run continuation path third
