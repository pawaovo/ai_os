# Multi Agent Governance Summary

> Executable contract for the first backend-owned governance projection that unifies multi-agent runtime, orchestration, remote bridge, mailbox, and approval state.

## Scenario: Read-Only Governance Projection

### 1. Scope / Trigger

- Trigger: changing `GET /api/multi-agent-governance`.
- Trigger: changing governance aggregation logic in `product/apps/space-desktop/scripts/dev-server.mjs`.
- Trigger: changing attention or activity normalization rules.
- Trigger: changing counts derived from orchestration, remote bridge, mailbox, approval, or runtime state.

### 2. Signatures

#### Product API

```ts
GET /api/multi-agent-governance
```

Returns:

```ts
{
  governance: MultiAgentGovernanceSummary;
}
```

#### Summary Shape

```ts
interface MultiAgentGovernanceSummary {
  status: "idle" | "active" | "running" | "awaiting-approval" | "failed";
  summary: string;
  generatedAt: string;
  workspace?: {
    id: string;
    name: string;
    trustLevel: string;
  };
  counts: {
    runtimes: number;
    readyRuntimes: number;
    orchestrations: number;
    activeOrchestrations: number;
    remoteSessions: number;
    activeRemoteSessions: number;
    mailboxDelivered: number;
    mailboxHandled: number;
    pendingApprovals: number;
  };
  attention: MultiAgentGovernanceItemSummary[];
  activity: MultiAgentGovernanceItemSummary[];
}

interface MultiAgentGovernanceItemSummary {
  id: string;
  kind: "orchestration" | "remote-bridge" | "mailbox" | "approval";
  status: string;
  title: string;
  detail: string;
  at: string;
  targetPage: "agents" | "approvals" | "runs" | "settings";
  runId?: string;
  approvalId?: string;
  orchestrationId?: string;
  remoteBridgeSessionId?: string;
}
```

### 3. Counts Contract

- `runtimes`
  - source: `listAgentRuntimeSummaries(...)`
- `readyRuntimes`
  - source: runtime summaries where `available === true`
- `orchestrations`
  - source: `listAgentOrchestrations(...)`
- `activeOrchestrations`
  - source: orchestrations not in `completed | failed | interrupted`
- `remoteSessions`
  - source: `listRemoteBridgeSessions(...)`
- `activeRemoteSessions`
  - source: remote sessions where `status === "active"`
- `mailboxDelivered`
  - source: mailbox items where `status === "delivered"`
- `mailboxHandled`
  - source: mailbox items where `status === "handled"`
- `pendingApprovals`
  - source: approvals where `status === "pending"`

### 4. Contracts

- Governance summary must remain read-only and backend-owned.
- Governance summary must not introduce new persistence tables or a second execution model.
- Governance summary must be projected from existing state only:
  - agent runtime registry
  - agent orchestrations
  - remote bridge pilot sessions/events
  - mailbox items
  - approval records
- Governance summary must respect the active workspace selection and must not leak records from another workspace.
- `attention` must stay short and operator-focused:
  - pending approvals
  - failed orchestration
  - active orchestration
  - delivered mailbox backlog
  - active remote sessions
- `activity` must be normalized into one stable shape rather than exposing raw orchestration, mailbox, remote event, or approval objects.
- `activity` must be sorted newest-first.
- Frontend must consume this summary directly instead of reconstructing governance state from multiple endpoints.

### 5. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No workspace-selected data exists | summary returns zero counts plus empty `attention` / `activity` arrays | `space-desktop.test.mjs` |
| Pending approvals exist | summary status becomes `awaiting-approval`; attention includes approval item | `space-desktop.test.mjs` |
| Failed orchestration exists | attention includes failed orchestration item | `space-desktop.test.mjs` |
| Mixed runtime/remote/mailbox state exists | counts match the underlying source endpoints exactly | `space-desktop.test.mjs` |
| Active workspace changes | summary reflects only the new workspace-scoped orchestration, mailbox, remote, and approval data | `space-desktop.test.mjs` |

### 6. Tests Required

- `cd product && npm test`
  - assert static source reference to `/api/multi-agent-governance`
  - assert counts match runtime/orchestration/remote/mailbox/approval endpoints
  - assert attention/activity normalized shape
  - assert workspace scoping
- `cd product && npm run validate:electron`
  - assert product still passes Electron validation
- `cd product && npm run package:mac`
  - assert packaged app still builds
- Packaged smoke:
  - assert packaged `/` includes governance overview anchors
  - assert packaged `/api/multi-agent-governance` returns `status`, `counts`, `attention`, and `activity`

### 7. Wrong vs Correct

#### Wrong

- Create a new table just for governance dashboard rows.
- Recompute attention/activity independently in the renderer.
- Return raw orchestration rows, remote events, mailbox items, and approval records in inconsistent shapes.

#### Correct

- Keep governance as a thin read-only projection over the current product-owned runtimes.
- Return one normalized summary payload that the Agents page can render directly.
