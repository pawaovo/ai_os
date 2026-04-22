# Recipe Prompt App Bridge

> Executable contract for bridging Prompt App Draft export into installed local capabilities.

## Scenario: Prompt App Installation Bridge

### 1. Scope / Trigger

- Trigger: changing recipe export behavior in `product/apps/space-desktop/scripts/dev-server.mjs`.
- Trigger: changing Prompt App Draft installation metadata in shared types.
- Trigger: changing Forge editor installation display in `product/apps/space-desktop/src/browser.ts`.
- Trigger: changing tests for export and recipe-backed capability rerun.

### 2. Signatures

#### Shared Draft Shape

```ts
interface PromptAppInstallation {
  installedCapabilityId: string;
  installedAt: string;
}

interface PromptAppDraftRecord {
  installation?: PromptAppInstallation;
}
```

#### Persistence Column

`recipes` must keep:

```sql
installed_at TEXT
```

#### Export Route

```ts
POST /api/recipes/:id/export
```

May continue returning `recipe`, but must also allow additive `promptApp`.

### 3. Contracts

- Exporting a recipe installs the Prompt App Draft as a local capability bridge.
- The bridge must remain workspace-aware and local-first.
- Export must preserve the stable capability id on repeated exports for the same recipe.
- `installation.installedCapabilityId` must align with the recipe `capabilityId`.
- `installation.installedAt` must reflect the latest successful bridge install/export time.
- Recipe-backed capability reruns must clearly state they are running through the Prompt App bridge.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| First export | draft gets installation state and capability id | `space-desktop.test.mjs` |
| Re-export same recipe | same capability id is updated and installation state remains valid | `space-desktop.test.mjs` |
| Recipe-backed capability rerun | output clearly reflects Prompt App bridge replay and binding | `space-desktop.test.mjs` |

### 5. Good / Base / Bad Cases

#### Good

- Prompt App Draft shows installed capability bridge state.
- Export updates the same local capability when rerun.
- Capability rerun output references the Prompt App bridge explicitly.

#### Base

- Bridge remains additive to existing recipe routes and UI.

#### Bad

- Treating export as a disconnected capability copy with no installation state.
- Generating a fresh capability id every time for the same draft.
- Hiding bridge execution details from rerun output.

### 6. Tests Required

- `cd product && node --test tests/space-desktop.test.mjs`
  - export sets installation state
  - re-export preserves capability bridge
  - rerun output reflects Prompt App bridge replay
- `cd product && npm test`

### 7. Wrong vs Correct

#### Wrong

- Keep Prompt App installation implicit and UI-invisible.
- Export recipes without a stable bridge back to the installed capability.

#### Correct

- Treat export as Prompt App installation into a local capability.
- Preserve a stable bridge state across export and rerun.
- Keep the bridge thin and local-first.
