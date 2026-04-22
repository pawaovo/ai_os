# Artifact Source Navigation Surface

> Executable contract for showing source run linkage in the Artifacts page and opening the linked run directly.

## Scenario: Artifact To Run Jump

### 1. Scope / Trigger

- Trigger: changing artifact DOM in `product/apps/space-desktop/public/index.html`.
- Trigger: changing artifact rendering or actions in `product/apps/space-desktop/src/browser.ts`.
- Trigger: changing artifact bilingual copy in `product/apps/space-desktop/src/i18n.ts`.
- Trigger: changing static artifact UI assertions in `product/tests/space-desktop.test.mjs`.

### 2. Signatures

#### Required DOM ids

- `artifact-open-button`
- `artifact-open-run-button`
- `artifact-delete-button`
- `artifact-list`
- `artifact-help`
- `artifact-preview`

#### Required Artifact Fields Consumed By The Renderer

```ts
interface ArtifactSummary {
  id: string;
  title: string;
  kind: string;
  source: string;
  runId?: string;
  updatedAt: string;
  content: string;
}
```

### 3. Contracts

- Artifacts surface must stay additive to the current navigation and detail layout.
- The renderer must reuse the existing `openRun(...)` flow when jumping to a source run.
- The source-run button must stay disabled when the selected artifact has no `runId`.
- Artifact list/detail metadata may expose `runId`, but must continue using the artifact record as the source of truth.
- New copy must exist in both English and Chinese.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No artifact selected | source-run button stays disabled | renderer behavior |
| Selected artifact has no `runId` | source-run button stays disabled and help text remains artifact-only | renderer behavior |
| Selected artifact has `runId` | source-run button becomes enabled and metadata shows source run linkage | manual UI smoke |
| Source-run action executes | product navigates to Runs and opens the linked run | manual UI smoke |

### 5. Good / Base / Bad Cases

#### Good

- A user can move from an artifact back to its originating run without searching manually.
- Artifact provenance remains visible in list/detail metadata.

#### Base

- First version focuses on source run linkage only.

#### Bad

- Duplicating run detail under the Artifacts page.
- Guessing source run linkage from titles or timestamps instead of `artifact.runId`.

### 6. Tests Required

- `cd product && npm test`
  - assert artifact source-run button DOM id
  - assert browser source references artifact-to-run helpers
  - assert bilingual source-run button copy exists
- Packaged smoke:
  - assert Artifacts page renders source-run button
  - assert button is enabled for artifacts linked to runs

### 7. Wrong vs Correct

#### Wrong

- Show a fake source-run button for every artifact.
- Rebuild run provenance heuristically in the renderer.

#### Correct

- Use `artifact.runId` directly and route through existing Runs behavior.
