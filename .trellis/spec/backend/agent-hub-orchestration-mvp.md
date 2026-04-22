# Agent Hub Orchestration MVP

> Executable contract for the first local-first Agent Hub orchestration flow built on top of existing child runs.

## Scenario: Local Agent Orchestration

### 1. Scope / Trigger

- Trigger: changing `POST /api/agent-orchestrations/start`.
- Trigger: changing `GET /api/agent-orchestrations`.
- Trigger: changing `GET /api/agent-orchestrations/:id`.
- Trigger: changing orchestration persistence in `product/apps/space-desktop/scripts/dev-server.mjs`.
- Trigger: changing how planner / worker / reviewer tasks link to child runs.

### 2. Signatures

#### Product APIs

```ts
GET /api/agent-orchestrations
POST /api/agent-orchestrations/start
GET /api/agent-orchestrations/:id
```

#### Start Input

```ts
interface AgentOrchestrationStartInput {
  goal: string;
  executorChoice?: "mock" | "codex" | "claude-code";
  workerExecutorChoice?: "mock" | "codex" | "claude-code";
  timeoutMs?: number;
  deterministicFailureTaskRole?: "planner" | "worker" | "reviewer";
}
```

#### Summary Shape

```ts
interface AgentOrchestrationSummary {
  id: string;
  goal: string;
  status: string;
  workspaceId?: string;
  summary?: string;
  tasks: AgentOrchestrationTaskSummary[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface AgentOrchestrationTaskSummary {
  id: string;
  role: "planner" | "worker" | "reviewer";
  title: string;
  status: string;
  executorChoice: "mock" | "codex" | "claude-code";
  runtimeId: string;
  runtimeTitle: string;
  runtime: {
    id: string;
    title: string;
    status?: string;
    runId?: string;
  };
  childRunId?: string;
  resultSummary?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
```

#### Persistence

```sql
CREATE TABLE agent_orchestrations (
  id TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  status TEXT NOT NULL,
  workspace_id TEXT,
  summary TEXT,
  tasks_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
```

### 3. Contracts

- Orchestration is additive to existing Agent Hub runtime registry.
- Orchestration must not redefine the child run model.
- Each agent task must launch child work through `createRunSession(...)`.
- Child run approvals, events, artifacts, continuation state, and failure semantics remain owned by the existing run/session layer.
- Orchestration owns only:
  - parent aggregate status
  - task ordering
  - task-to-run linkage
  - aggregate summary text
- MVP plan shape is fixed:
  - `planner`
  - `worker`
  - `reviewer`
- MVP may sequence tasks serially to preserve current workspace runtime projection semantics.
- Orchestration must pin workspace context when creating child runs, so later tasks do not drift if the user changes active workspace.
- `deterministicFailureTaskRole` is allowed for regression testing and must force the matching child task into a failed terminal state.
- `GET /api/agent-orchestrations` and `GET /api/agent-orchestrations/:id` must expose `task.runtime.runId` when a child run has been created.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| Start orchestration in runnable workspace | orchestration is created with planner / worker / reviewer tasks | `space-desktop.test.mjs` |
| Child runs complete normally | parent orchestration becomes `completed` | `space-desktop.test.mjs` |
| Deterministic failure role is `worker` | worker child run fails and parent orchestration becomes `failed` | `space-desktop.test.mjs` |
| Child run exists | task exposes `runtime.runId` and `childRunId` | `space-desktop.test.mjs` |
| List endpoint after completion | orchestration summary appears in `/api/agent-orchestrations` with correct aggregate status | `space-desktop.test.mjs` |

### 5. Good / Base / Bad Cases

#### Good

- Parent orchestration stays thin and simply coordinates child runs.
- UI can deep-link into child runs without duplicating run detail logic.
- Failure of one child task cleanly fails the orchestration aggregate.

#### Base

- Planner / worker / reviewer can all default to `mock` for deterministic local MVP behavior.
- Product remains local-only and additive.

#### Bad

- Creating a second run/session persistence layer for orchestration children.
- Embedding approval resolution or artifact storage into orchestration-specific tables.
- Making orchestration depend on `GET /api/agent-runtimes` instead of `createRunSession(...)`.

### 6. Tests Required

- `cd product && npm test`
  - assert static Agents surface ids
  - assert orchestration success path
  - assert deterministic failure propagation
- `cd product && npm run validate:electron`
  - assert product still passes Electron config validation
- `cd product && npm run package:mac`
  - assert packaged app still builds
- Packaged smoke:
  - assert packaged `/` includes Agents surface ids
  - assert packaged `/api/agent-orchestrations` returns `{ orchestrations: [] }` on a clean profile

### 7. Wrong vs Correct

#### Wrong

- Start a parent orchestration and invent custom child execution records outside `runs`.
- Make the frontend reconstruct orchestration progress by scanning all runs itself.

#### Correct

- Persist one parent orchestration summary and reuse child runs as the single execution model.
- Expose orchestration state directly through dedicated APIs while deep-linking to existing run details.
