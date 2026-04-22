# Remote Bridge Pilot MVP

> Executable contract for the first authenticated single-channel remote bridge pilot built on top of existing local run semantics.

## Scenario: Single-Channel Remote Bridge

### 1. Scope / Trigger

- Trigger: changing `GET /api/remote-bridge/pilot`.
- Trigger: changing `POST /api/remote-bridge/pilot/sessions`.
- Trigger: changing authenticated remote bridge run or approval endpoints.
- Trigger: changing remote bridge persistence or audit behavior in `product/apps/space-desktop/scripts/dev-server.mjs`.

### 2. Signatures

#### Product APIs

```ts
GET /api/remote-bridge/pilot
POST /api/remote-bridge/pilot/sessions
GET /api/remote-bridge/pilot/sessions/:id
POST /api/remote-bridge/pilot/sessions/:id/runs/start
GET /api/remote-bridge/pilot/sessions/:id/runs/:runId/live
POST /api/remote-bridge/pilot/sessions/:id/runs/:runId/approval
```

#### Session Create Input

```ts
interface RemoteBridgeSessionCreateInput {
  principalLabel?: string;
  workspaceId?: string;
}
```

#### Remote Run Start Input

```ts
interface RemoteBridgeRunStartInput {
  goal: string;
  executorChoice?: "mock" | "codex" | "claude-code";
  timeoutMs?: number;
}
```

#### Pilot Summary Shape

```ts
interface RemoteBridgePilotSummary {
  status: string;
  transport: "http-bearer";
  detail: string;
  baseUrl: string;
  sessions: RemoteBridgeSessionSummary[];
}

interface RemoteBridgeSessionSummary {
  id: string;
  principalId: string;
  principalLabel: string;
  channelKind: "single-http-bearer";
  workspaceId: string;
  workspaceName?: string;
  status: string;
  tokenPreview: string;
  lastRunId?: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
  eventCount?: number;
  latestEvent?: RemoteBridgeEventSummary;
}

interface RemoteBridgeEventSummary {
  id: string;
  sessionId: string;
  principalId: string;
  workspaceId: string;
  runId?: string;
  approvalId?: string;
  type: string;
  message: string;
  createdAt: string;
}
```

### 3. Contracts

- Pilot is single-channel only:
  - `transport = http-bearer`
  - `channelKind = single-http-bearer`
- Every remote bridge session must bind:
  - one principal identity
  - one workspace
  - one bearer token hash
- UI-local session detail may be read without bearer auth because it is a local product surface.
- Remote run and approval actions must require bearer auth.
- Bridge sessions must store token hashes, not raw bearer tokens.
- `tokenPreview` may be shown in UI, but full bearer token is only returned at session creation time.
- Remote bridge run start must create child work through `createRunSession(...)`.
- Remote live reads must reuse existing run live / persisted checkpoint behavior.
- Remote approval resolution must reuse existing `resolveRunApproval(...)`.
- Remote bridge must not invent a parallel approval, continuation, or run model.
- Bridge events must be auditable and session-bound.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No sessions exist | `GET /api/remote-bridge/pilot` returns `sessions: []` | `space-desktop.test.mjs` |
| Session is created | response returns `session` plus `connect` payload with bearer token and URLs | `space-desktop.test.mjs` |
| Authenticated remote run starts | session records `lastRunId` and live payload returns child run state | `space-desktop.test.mjs` |
| Remote run hits runtime approval | authenticated approval endpoint can grant and run continues | `space-desktop.test.mjs` |
| Bearer token missing | bridge returns `401` | `space-desktop.test.mjs` |
| Bearer token invalid | bridge returns `403` | `space-desktop.test.mjs` |

### 5. Good / Base / Bad Cases

#### Good

- Remote principal is explicit and auditable.
- Workspace context stays pinned even if the local UI later switches workspaces.
- Remote bridge reuses local continuation semantics instead of bypassing them.

#### Base

- Pilot remains local-to-local HTTP for the first implementation.
- Channel count stays one.

#### Bad

- Storing raw bearer token in persistent session records.
- Letting remote runs drift to the current active workspace instead of the bound workspace.
- Creating remote-only approval or resume semantics.

### 6. Tests Required

- `cd product && npm test`
  - assert static Remote Bridge surface ids
  - assert authenticated run start
  - assert runtime approval grant path
  - assert missing/invalid token behavior
- `cd product && npm run validate:electron`
  - assert product still passes Electron validation
- `cd product && npm run package:mac`
  - assert packaged app still builds
- Packaged smoke:
  - assert packaged `/` includes Remote Bridge panel ids
  - assert packaged `/api/remote-bridge/pilot` returns `transport = http-bearer`
  - assert packaged bridge session can start and complete a remote run

### 7. Wrong vs Correct

#### Wrong

- Treat remote bridge as a second orchestration or run runtime.
- Let remote actions bypass the same workspace trust and approval flow local runs use.

#### Correct

- Keep remote bridge as an authenticated session layer over the existing local run model.
- Make every remote action principal-bound, workspace-bound, and auditable.
