# Prompt App Contract

> Executable contract for the first-step Prompt App Draft layer built on top of the current recipe flow.

## Scenario: Prompt App Draft Over Recipe Flow

### 1. Scope / Trigger

- Trigger: changing `product/packages/capability/capability-contract/src/index.ts` recipe or prompt app types.
- Trigger: changing `product/apps/space-desktop/scripts/dev-server.mjs` recipe persistence or recipe APIs.
- Trigger: changing `product/apps/space-desktop/src/browser.ts` Forge editor binding display.
- Trigger: changing tests around recipe creation, update, export, or Prompt App Draft binding.

This scenario is cross-layer because the Prompt App Draft contract lives in shared types, is persisted through the product layer, and is rendered in the existing Forge editor.

### 2. Signatures

#### Shared Contract

```ts
interface PromptAppRuntimeBinding {
  workspaceId?: string;
  executionMode: "workspace-runtime";
  toolPolicy: "workspace-default";
  artifactPolicy: "workspace-artifact";
}

interface PromptAppDraftRecord {
  id: string;
  title: string;
  prompt: string;
  inputSpec: string;
  outputSpec: string;
  runtimeBinding: PromptAppRuntimeBinding;
  sourceRunId?: string;
  workspaceId?: string;
  capabilityId?: string;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
}

interface RecipeRecord extends PromptAppDraftRecord {}
```

#### Persistence Column

`recipes` must keep:

```sql
runtime_binding_json TEXT
```

#### API Compatibility

- `POST /api/recipes/from-run`
- `PATCH /api/recipes/:id`
- `POST /api/recipes/:id/export`

These routes may continue returning `recipe`, but they must also be allowed to return additive `promptApp` aliases.

### 3. Contracts

- First step must stay additive. `/api/recipes` remains the route surface.
- Prompt App Draft is the formal contract layered on top of the existing recipe object, not a second product runtime.
- `runtimeBinding` must always be present on persisted recipe summaries, even if older rows need a derived default.
- The default binding contract for this step is:
  - `executionMode = "workspace-runtime"`
  - `toolPolicy = "workspace-default"`
  - `artifactPolicy = "workspace-artifact"`
- `workspaceId` in the binding must align with the recipe workspace when one exists.
- The Forge editor must show binding values so the Prompt App Draft is visible to the user without adding a new page.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| Recipe created from completed run | returned recipe/promptApp includes runtime binding | `space-desktop.test.mjs` |
| Older recipe row without `runtime_binding_json` | summary derives default binding | server summary fallback |
| Recipe updated | binding is preserved unless explicitly changed by a later task | update flow |
| Recipe exported as capability | recipe and prompt app alias still expose runtime binding | export flow |

### 5. Good / Base / Bad Cases

#### Good

- Prompt App Draft is a real shared contract, not only a UI label.
- Existing Forge recipe flow remains intact.
- Runtime binding is visible and workspace-aware.

#### Base

- First step keeps runtime binding read-mostly and deterministic.
- No new Prompt App runtime or page is introduced.

#### Bad

- Replacing `/api/recipes` with a second parallel Prompt App API prematurely.
- Adding complex transport/tool/runtime policies before the workspace runtime is stable.
- Letting the browser invent binding defaults instead of the backend/shared contract.

### 6. Tests Required

- `cd product && node --test tests/space-desktop.test.mjs`
  - recipe creation returns runtime binding
  - recipe update preserves runtime binding
  - export returns prompt app alias and runtime binding
- `cd product && npm test`
  - full product regression

### 7. Wrong vs Correct

#### Wrong

- Treat Prompt App as a brand-new runtime disconnected from the current recipe flow.
- Require a new page or route before the contract is stable.
- Make runtime binding optional or renderer-only.

#### Correct

- Formalize Prompt App Draft as the shared contract layered over recipes.
- Keep the first step additive and workspace-aware.
- Expose runtime binding from persistence through API and into the current Forge editor.
