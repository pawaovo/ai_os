# P1 Recipe Prompt App Bridge

## Goal

Turn the existing Prompt App Draft export path into an explicit install-and-run bridge between recipes and local capabilities.

## Requirements

- Keep the current Forge export path, but formalize export as Prompt App installation.
- Persist minimal Prompt App installation state on the draft.
- Make installed Prompt App Drafts visibly connected to their exported local capability.
- Make recipe-backed capability runs clearly show they are executing through the Prompt App bridge.

## Scope Boundary

- In scope:
  - Prompt App installation metadata
  - recipe export bridge state
  - capability run output bridge messaging
  - Forge editor display of bridge state
- Out of scope:
  - standalone Prompt App runtime
  - capability marketplace
  - MCP execution
  - remote bridge

## Dependencies

- Should build on `P1 Prompt App Contract`.

## Acceptance Criteria

- [ ] Exporting a recipe records Prompt App installation state.
- [ ] Forge UI shows installed capability bridge state.
- [ ] Recipe-backed capability runs clearly reflect Prompt App bridge execution.
- [ ] Existing recipe create/test/export/rerun flows still pass.

## Suggested Validation

- Verify the bridge remains local-first and workspace-aware.
- Verify export update path still updates the same capability bridge.

## Suggested Commit Boundary

- Installation state first
- UI projection second
- Capability run bridge output third
