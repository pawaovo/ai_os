# Cross Object Navigation Shortcuts

> Executable contract for additive shortcuts that jump between mailbox items, approval history, Forge recipes, and their linked runs or sessions.

## Scenario: Linked Object Jump

### 1. Scope / Trigger

- Trigger: changing mailbox, approval history, or Forge editor DOM in `product/apps/space-desktop/public/index.html`.
- Trigger: changing object-link rendering or click behavior in `product/apps/space-desktop/src/browser.ts`.
- Trigger: changing bilingual labels used by the linked object controls in `product/apps/space-desktop/src/i18n.ts`.
- Trigger: changing static UI assertions in `product/tests/space-desktop.test.mjs`.

### 2. Signatures

#### Required DOM ids

- `mailbox-list`
- `approval-history-list`
- `recipe-open-source-run-button`

#### Required Fields Consumed By The Renderer

```ts
interface ApprovalRecord {
  approvalId: string;
  runId: string;
}

interface MailboxItemSummary {
  id: string;
  runId?: string;
  orchestrationId?: string;
  remoteBridgeSessionId?: string;
}

interface PromptAppDraftRecord {
  id: string;
  sourceRunId?: string;
}
```

### 3. Contracts

- Cross-object navigation must stay additive to the existing list/detail surfaces.
- The renderer must reuse existing navigation helpers instead of creating new fetch or routing models just for shortcuts.
- Mailbox items must prefer linked `runId`, then linked `orchestrationId`, then linked `remoteBridgeSessionId`.
- Approval history items must deep-link to the linked run when `approval.runId` exists.
- The Forge recipe source-run button must stay disabled when the active recipe has no `sourceRunId`.
- New or reused button labels must remain bilingual.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| Mailbox item has `runId` | opens Runs page and linked run detail | manual UI smoke |
| Mailbox item has no `runId` but has `orchestrationId` | opens Agents page and linked orchestration | manual UI smoke |
| Mailbox item has only `remoteBridgeSessionId` | opens Settings page and linked remote bridge session | manual UI smoke |
| Approval item has `runId` | opens Runs page and linked run detail | manual UI smoke |
| Active recipe has no `sourceRunId` | source-run button stays disabled | renderer behavior |
| Active recipe has `sourceRunId` | source-run button becomes enabled and opens Runs page | manual UI smoke |

### 5. Good / Base / Bad Cases

#### Good

- A user can move between related objects without manually searching IDs or switching pages first.
- The product keeps a single navigation path per object type.

#### Base

- First version only uses linkage that already exists in current records.

#### Bad

- Creating extra persistence only to store duplicated navigation targets.
- Guessing related objects from titles, timestamps, or body text.

### 6. Tests Required

- `cd product && npm test`
  - assert mailbox/approval/Forge source-run controls exist
  - assert browser source references the linked object datasets and shared run-navigation helper
- Packaged smoke:
  - assert mailbox items open linked runs, orchestrations, or remote sessions
  - assert approval history opens the linked run
  - assert Forge recipe source-run button opens the linked run

### 7. Wrong vs Correct

#### Wrong

- Make linked objects visible only through raw IDs in text.
- Add a second object-detail renderer only for these shortcuts.

#### Correct

- Reuse the existing page helpers and enable shortcuts only when the linked ID already exists.
