# Mailbox Runtime MVP

> Executable contract for the first local mailbox runtime that records coordination handoffs from orchestration and remote bridge flows.

## Scenario: Local Mailbox Runtime

### 1. Scope / Trigger

- Trigger: changing `GET /api/mailbox`.
- Trigger: changing mailbox persistence in `product/apps/space-desktop/scripts/dev-server.mjs`.
- Trigger: changing mailbox writes from orchestration or remote bridge flows.
- Trigger: changing mailbox tests in `product/tests/space-desktop.test.mjs`.

### 2. Signatures

#### Product API

```ts
GET /api/mailbox
```

Returns:

```ts
{
  items: MailboxItemSummary[];
}
```

#### Summary Shape

```ts
interface MailboxItemSummary {
  id: string;
  workspaceId: string;
  flowKind: "agent-orchestration" | "remote-bridge";
  senderKind: string;
  senderLabel: string;
  recipientKind: string;
  recipientLabel: string;
  title: string;
  body: string;
  status: "delivered" | "handled";
  createdAt: string;
  updatedAt: string;
  handledAt?: string;
  threadId?: string;
  runId?: string;
  orchestrationId?: string;
  remoteBridgeSessionId?: string;
}
```

#### Persistence

```sql
CREATE TABLE mailbox_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  thread_id TEXT,
  run_id TEXT,
  orchestration_id TEXT,
  remote_bridge_session_id TEXT,
  flow_kind TEXT NOT NULL,
  sender_kind TEXT NOT NULL,
  sender_label TEXT NOT NULL,
  recipient_kind TEXT NOT NULL,
  recipient_label TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  handled_at TEXT
);
```

### 3. Contracts

- Mailbox is a coordination record layer, not a second run/runtime store.
- Mailbox items must stay workspace-scoped.
- Mailbox items may link to:
  - `runId`
  - `orchestrationId`
  - `remoteBridgeSessionId`
- MVP lifecycle is fixed:
  - `delivered`
  - `handled`
- Orchestration writes:
  - `Planner Handoff` to `Worker`
  - `Worker Handoff` to `Reviewer`
  - `Reviewer Summary` to `User`
  - failure summary to `User` when a role fails
- Downstream orchestration task start marks its inbound mailbox item as `handled`.
- Remote bridge writes:
  - `Remote Session Created`
  - `Remote Run Started`
  - `Remote Approval Resolved`
- Remote bridge mailbox items may remain `delivered` in MVP.
- `GET /api/mailbox` must respect the active workspace and must not leak mailbox items from another workspace.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| Orchestration completes | mailbox contains orchestration handoff items | `space-desktop.test.mjs` |
| Downstream orchestration task starts | earlier handoff item becomes `handled` | `space-desktop.test.mjs` |
| Remote bridge session and approval flow execute | mailbox contains remote bridge items | `space-desktop.test.mjs` |
| Switch active workspace | `/api/mailbox` only returns items for the new workspace | `space-desktop.test.mjs` |

### 5. Good / Base / Bad Cases

#### Good

- Mailbox gives one readable timeline of system-generated handoffs.
- Items remain linked to the underlying run or session without duplicating run state.

#### Base

- MVP stays read-only in the product surface.
- No manual compose or free-form chat is required.

#### Bad

- Storing mailbox as a second execution model.
- Returning mailbox items across workspace boundaries.
- Replacing audit logs or run history with mailbox records.

### 6. Tests Required

- `cd product && npm test`
  - assert mailbox DOM ids
  - assert orchestration mailbox items
  - assert remote bridge mailbox items
  - assert workspace scoping
- `cd product && npm run validate:electron`
  - assert Electron validation still passes
- `cd product && npm run package:mac`
  - assert packaged app still builds
- Packaged smoke:
  - assert packaged `/` includes mailbox panel ids
  - assert packaged `/api/mailbox` returns orchestration mailbox items after a packaged orchestration run

### 7. Wrong vs Correct

#### Wrong

- Use mailbox rows as a replacement for child run state or remote bridge audit state.

#### Correct

- Keep mailbox as a thin, linked coordination layer over existing orchestration and remote bridge runtimes.
