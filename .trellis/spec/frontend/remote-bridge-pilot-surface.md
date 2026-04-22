# Remote Bridge Pilot Surface

> Executable contract for the first read-only plus session-create Remote Bridge Pilot panel in Settings.

## Scenario: Remote Bridge Pilot Panel

### 1. Scope / Trigger

- Trigger: changing Remote Bridge DOM in `product/apps/space-desktop/public/index.html`.
- Trigger: changing `product/apps/space-desktop/src/browser.ts` remote bridge load/render logic.
- Trigger: changing `product/apps/space-desktop/src/i18n.ts` remote bridge copy.
- Trigger: changing static page assertions in `product/tests/space-desktop.test.mjs`.

### 2. Signatures

#### Required DOM ids

- `remote-bridge-pilot-title`
- `remote-bridge-pilot-form`
- `remote-bridge-principal-input`
- `remote-bridge-create-button`
- `remote-bridge-status`
- `remote-bridge-transport`
- `remote-bridge-base-url`
- `remote-bridge-session-list`
- `remote-bridge-connect`
- `remote-bridge-audit-list`
- `remote-bridge-help`

#### Frontend API Calls

```ts
GET /api/remote-bridge/pilot
POST /api/remote-bridge/pilot/sessions
GET /api/remote-bridge/pilot/sessions/:id
```

### 3. Contracts

- Panel lives inside Settings and remains additive.
- MVP UI may create sessions but must not directly start remote runs from the product panel.
- `principalLabel` is the only required create-session input in MVP.
- `connect` info from session creation is shown only in the current renderer state.
- Session list must render backend session summaries as-is.
- Audit list must render backend event summaries as-is.
- Copy must exist in both English and Chinese.
- Settings summary list must include a `Remote Bridge` item.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No sessions exist | panel renders empty-state copy for session list, connect info, and audit | `space-desktop.test.mjs` + manual smoke |
| Session create succeeds | session list refreshes and connect info renders the returned bearer token and URLs | manual UI smoke |
| Session detail fails to load | help text surfaces error while panel falls back safely | browser runtime behavior |

### 5. Good / Base / Bad Cases

#### Good

- User can create one bridge session and immediately see connect instructions.
- User can inspect recent session summaries and audit events.

#### Base

- Surface remains settings-scoped and compact.

#### Bad

- Putting remote bridge capability only in docs or hidden debug APIs.
- Hiding the returned bearer token and URLs after session creation.

### 6. Tests Required

- `cd product && npm test`
  - assert Remote Bridge Pilot DOM ids
  - assert browser source consumes `/api/remote-bridge/pilot`
- Packaged smoke:
  - assert packaged `/` includes Remote Bridge Pilot panel ids

### 7. Wrong vs Correct

#### Wrong

- Add a Remote Bridge backend without any user-visible session or audit surface.

#### Correct

- Provide a compact Settings panel that creates sessions, shows connect info, and renders recent audit activity from the backend.
