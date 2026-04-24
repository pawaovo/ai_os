# First Use Onboarding Surface

> Executable contract for the first-use setup surface that helps a user discover local executors, import a provider from Codex config, and clean up local test/demo data.

## Scenario: Start And Settings Onboarding Helpers

### 1. Scope / Trigger

- Trigger: changing onboarding DOM in `product/apps/space-desktop/public/index.html`.
- Trigger: changing onboarding rendering or actions in `product/apps/space-desktop/src/browser.ts`.
- Trigger: changing onboarding bilingual copy in `product/apps/space-desktop/src/i18n.ts`.
- Trigger: changing tests that assert setup discovery/import/reset UI.

### 2. Signatures

#### Required DOM ids

- `local-setup-title`
- `local-setup-refresh-button`
- `local-setup-import-provider-button`
- `local-setup-list`
- `local-setup-help`
- `local-data-reset-title`
- `local-data-reset-list`
- `local-data-reset-generated-button`
- `local-data-reset-profile-button`
- `local-data-backup-export-button`
- `local-data-backup-restore-button`
- `local-data-backup-file-input`
- `local-data-reset-help`

#### Frontend API Calls

```ts
GET /api/local-setup
POST /api/local-setup/import
POST /api/local-data/reset
GET /api/local-data/backup
POST /api/local-data/restore
```

### 3. Contracts

- The renderer must consume local setup discovery from backend APIs instead of reading `~/.codex` or local CLI config directly.
- Start and Settings may both surface the same onboarding/setup summary.
- Provider import must remain a backend-owned action so raw secrets do not pass through renderer state.
- Reset actions must require an explicit confirmation prompt before the request is sent.
- Restore actions must require an explicit confirmation prompt before the request is sent.
- `generated-data` reset must keep providers, workspaces, language selection, and MCP config intact.
- `profile` reset may remove providers and workspaces, but the UI must recover to a clean empty state without reload.
- Local backup export may stay browser-downloaded, but the renderer must not read the profile directory directly.
- The surface must explain that provider API keys are excluded from local backups in this first cut.
- New onboarding copy must exist in both English and Chinese.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No local Codex config exists | setup panel shows unavailable import state, not a blank panel | `space-desktop.test.mjs` |
| Local Codex config exists | import button becomes available and preview metadata renders | `space-desktop.test.mjs` |
| Import succeeds | Providers page reflects the imported provider without exposing raw API key | `space-desktop.test.mjs` + manual UI smoke |
| Generated-data reset succeeds | generated records clear while providers/workspaces remain | `space-desktop.test.mjs` |
| Profile reset succeeds | providers/workspaces clear and Start/Settings recover to empty-state setup | `space-desktop.test.mjs` + manual UI smoke |
| Backup export succeeds | browser can download a local backup manifest from backend data | `space-desktop.test.mjs` |
| Backup restore succeeds | Start/Settings recover restored counts and selections without reload | `space-desktop.test.mjs` + manual UI smoke |
| Language switches after discovery has loaded | onboarding labels/help/buttons re-render in the selected language | packaged App smoke |

### 5. Good / Base / Bad Cases

#### Good

- A user can see whether local Codex and Claude Code are discoverable.
- A user can import provider settings from local Codex config in one action.
- A user can clear generated local test/demo data without manually editing the app profile.
- A user can export local product data and restore it later without manually touching the profile directory.

#### Base

- The first-use helper remains additive and does not replace the existing Space or Providers flows.

#### Bad

- Reading local config files directly in browser code.
- Exposing raw provider secrets in renderer state or DOM.
- Providing destructive reset actions with no explicit confirmation.
- Treating backup/restore as a hidden filesystem-only workflow with no user-facing explanation.

### 6. Tests Required

- `cd product && npm test`
  - assert onboarding/reset DOM anchors
  - assert browser source references `/api/local-setup`, `/api/local-data/reset`, `/api/local-data/backup`, and `/api/local-data/restore`
  - assert bilingual keys exist
  - assert import/reset integration behavior
  - assert backup export/restore UI wiring exists
- Packaged smoke:
  - assert Start or Settings renders onboarding summary
  - assert language switching updates onboarding copy

### 7. Wrong vs Correct

#### Wrong

- Add an onboarding panel that duplicates provider/workspace logic entirely in the browser.
- Make reset buttons fire destructive backend requests without an explicit prompt.

#### Correct

- Keep onboarding as a thin frontend surface over backend-owned discovery, import, and reset operations.
- Make provider import and reset behavior explicit, local-first, and testable.
