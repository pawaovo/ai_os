# Run Follow Up Surface

> Executable contract for the runs-side shortcut surface that helps a user turn a completed run into a saved artifact, follow-up automation, or Forge recipe.

## Scenario: Runs Page Next Actions

### 1. Scope / Trigger

- Trigger: changing `product/apps/space-desktop/public/index.html` runs-side follow-up DOM.
- Trigger: changing `product/apps/space-desktop/src/browser.ts` run follow-up rendering or actions.
- Trigger: changing `product/apps/space-desktop/src/i18n.ts` run follow-up copy.
- Trigger: changing static or integration tests for run follow-up actions in `product/tests/space-desktop.test.mjs`.

### 2. Signatures

#### Required DOM ids

- `run-follow-up-title`
- `run-follow-up-status`
- `run-follow-up-summary`
- `run-follow-up-save-artifact-button`
- `run-follow-up-create-automation-button`
- `run-follow-up-create-recipe-button`
- `run-follow-up-help`

#### Frontend API Calls

```ts
POST /api/artifacts
POST /api/automations
POST /api/recipes/from-run
```

### 3. Contracts

- The follow-up surface must stay additive to the existing Runs page.
- The follow-up surface must only enable its action buttons for a completed selected run.
- The follow-up surface must not create a second run-detail model; it must reuse the existing selected run state.
- Saving a follow-up artifact must preserve `runId` linkage so the artifact remains traceable to the originating run.
- Creating a follow-up automation may use a lightweight default prompt and title derived from the selected run.
- Creating a Forge recipe must reuse the existing `/api/recipes/from-run` path instead of creating a parallel shortcut API.
- New follow-up copy must exist in both English and Chinese.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No run selected | panel shows empty-state copy and actions stay disabled | renderer behavior |
| Selected run is non-terminal | panel shows waiting copy and actions stay disabled | renderer behavior |
| Selected run is completed | artifact / automation / recipe buttons become enabled | manual UI smoke |
| Artifact action succeeds | Artifacts page can open the newly created follow-up artifact | manual UI smoke + `space-desktop.test.mjs` |
| Automation action succeeds | Automations page reflects the new follow-up automation | `space-desktop.test.mjs` |
| Recipe action succeeds | Forge page reflects the newly created recipe | `space-desktop.test.mjs` |

### 5. Good / Base / Bad Cases

#### Good

- A user can finish a run and immediately turn it into persistent follow-up work.
- Follow-up actions reuse existing product routes and data models.

#### Base

- The first version stays lightweight and shortcut-oriented.

#### Bad

- Rebuilding artifact, automation, or recipe creation as a second hidden workflow only for Runs.
- Enabling shortcut actions for incomplete runs.

### 6. Tests Required

- `cd product && npm test`
  - assert follow-up DOM ids
  - assert browser source references render/action helpers
  - assert bilingual follow-up keys exist
  - assert a completed run can drive artifact, automation, and recipe creation
- Packaged smoke:
  - assert Runs page shows the follow-up panel
  - assert a completed run leaves the panel in an enabled state

### 7. Wrong vs Correct

#### Wrong

- Add a follow-up panel that duplicates the entire artifact, automation, or Forge forms.
- Let any selected run create follow-up records regardless of completion state.

#### Correct

- Keep follow-up as a compact shortcut panel over the existing artifact, automation, and Forge APIs.
- Gate actions on the selected run state and preserve run linkage where relevant.
