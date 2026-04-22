# Workspace Long Run Continuation

> Executable contract for durable run runtime checkpoints and first-step continuation in the workspace runtime.

## Scenario: Persisted Run Runtime Checkpoints

### 1. Scope / Trigger

- Trigger: changing `product/apps/space-desktop/scripts/dev-server.mjs` run persistence, `/api/runs/:id/live`, `/api/runs/:id/approval`, or `/api/runs/:id/cancel`.
- Trigger: changing browser behavior for persisted live-run fallback.
- Trigger: changing tests around restart, pending approvals, or live run rehydration.

This scenario is cross-layer because live run state starts in memory, is checkpointed into SQLite-backed product storage, and is consumed again by the renderer after restart.

### 2. Signatures

#### Run Persistence Columns

`runs` must keep:

```sql
runtime_state_json TEXT
continuation_state_json TEXT
last_checkpoint_at TEXT
```

#### Live Run Fallback

```ts
GET /api/runs/:id/live
```

Must return either:

- active in-memory live session state, or
- persisted live-like runtime state checkpoint

#### Continuation State Shape

```ts
interface ContinuationState {
  kind: "resume-pre-run-approval" | "needs-rerun" | "history-only" | "none";
  resumable: boolean;
  site?: string;
  reason: string;
}
```

### 3. Contracts

- The first continuation step must stay product-layer scoped; it must not require executor protocol changes.
- Runtime checkpoints must be based on the existing live run contract:
  - `sessionId`
  - `currentTurn`
  - `queryLoop`
  - `items`
  - `pendingApproval`
  - `memoryUsage`
  - `memoryTrace`
- `GET /api/runs/:id/live` must not return `404` after restart when a persisted runtime checkpoint exists.
- `pre-run approval` is the first resumable path:
  - restart
  - load persisted live state
  - rehydrate session
  - approve or reject
  - continue execution
- Non-resumable paths after executor start must be explicit:
  - runtime approval pending at restart
  - executor stream interrupted by restart
  - artifact persistence interrupted by restart
- Non-resumable restarted runs must not pretend they are still truly running. They must downgrade to an interrupted/history state with rerun guidance.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| Restart happens during pre-run approval | persisted live state remains actionable | `space-desktop.test.mjs` pre-run continuation test |
| Restart happens during runtime approval | run downgrades to interrupted/history-only and rerun-required | `space-desktop.test.mjs` runtime approval restart test |
| Restart happens after terminal status | live fallback remains history-only | persisted run fallback |
| No checkpoint exists | `/api/runs/:id/live` may still return 404 | backward-compatible behavior |
| Renderer tries approval on non-resumable restarted run | request fails clearly instead of silently mutating state | approval error path |

### 5. Good / Base / Bad Cases

#### Good

- Pending pre-run approvals survive restart and can continue.
- Restarted runtime approvals do not masquerade as live resumable sessions.
- Live run fallback uses persisted checkpoint state instead of dropping all context.

#### Base

- First step supports manual rerun for non-resumable interrupted work.
- Executor protocol remains unchanged.

#### Bad

- Keeping `running` forever in persisted history after the app restarts.
- Requiring a second parallel runtime store for the first continuation step.
- Pretending executor-native process resume exists when it does not.

### 6. Tests Required

- `cd product && node --test tests/space-desktop.test.mjs`
  - restart during pre-run approval can continue
  - restart during runtime approval becomes rerun-required
- `cd product && npm test`
  - full product regression

### 7. Wrong vs Correct

#### Wrong

- Persist only run history and lose the active runtime checkpoint.
- Let restart make pending approval impossible to act on.
- Pretend any interrupted executor process can resume exactly where it left off.

#### Correct

- Persist enough runtime checkpoint state to support safe continuation.
- Limit true continuation to pre-run approval first.
- Mark already-started executor work as rerun-required after restart unless and until a stronger executor-level resume contract exists.
