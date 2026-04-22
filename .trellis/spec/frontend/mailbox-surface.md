# Mailbox Surface

> Executable contract for the first mailbox timeline surface inside the Agents page.

## Scenario: Mailbox Timeline Panel

### 1. Scope / Trigger

- Trigger: changing mailbox DOM in `product/apps/space-desktop/public/index.html`.
- Trigger: changing `product/apps/space-desktop/src/browser.ts` mailbox load/render logic.
- Trigger: changing `product/apps/space-desktop/src/i18n.ts` mailbox copy.
- Trigger: changing static mailbox assertions in `product/tests/space-desktop.test.mjs`.

### 2. Signatures

#### Required DOM ids

- `mailbox-title`
- `mailbox-list`
- `mailbox-help`

#### Frontend API Call

```ts
GET /api/mailbox
```

### 3. Contracts

- Mailbox surface lives on the `agents` page only in MVP.
- Mailbox panel is read-only in MVP.
- Mailbox list renders backend items as-is.
- If a mailbox item links to `runId`, clicking it should deep-link into the existing Runs view.
- Copy must exist in both English and Chinese.
- Settings summary list must include a `Mailbox` item.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No mailbox items exist | panel renders empty-state copy | `space-desktop.test.mjs` + manual smoke |
| Mailbox items exist | panel renders timeline items with linked run buttons where applicable | manual UI smoke |
| Mailbox load fails | help text surfaces error instead of blank list | browser runtime behavior |

### 5. Good / Base / Bad Cases

#### Good

- User can scan handoffs from orchestration and remote bridge in one place.
- User can jump from a mailbox item to the linked run.

#### Base

- Panel stays compact and timeline-like.

#### Bad

- Splitting mailbox into a separate standalone page before the Agents surface matures.
- Rebuilding mailbox items in frontend code from runs and events instead of consuming `/api/mailbox`.

### 6. Tests Required

- `cd product && npm test`
  - assert mailbox DOM ids
  - assert browser source consumes `/api/mailbox`
- Packaged smoke:
  - assert packaged `/` includes mailbox panel ids

### 7. Wrong vs Correct

#### Wrong

- Make mailbox visible only through backend APIs and not the product UI.

#### Correct

- Keep mailbox as an additive Agents-side timeline backed directly by `/api/mailbox`.
