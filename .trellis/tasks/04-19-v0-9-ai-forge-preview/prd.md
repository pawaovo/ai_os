# V0.9 AI Forge Preview

## Goal

Implement V0.9 from `ai_os/ai_os_docs/04-implementation-roadmap.md`: let users turn successful local runs into editable, testable, reusable local capabilities.

## Requirements

- Add a local recipe object.
- Add a minimal prompt app model for recipe input/output fields.
- Add Forge Preview UI:
  - select a successful run
  - create a recipe from that run
  - edit recipe title, prompt, input spec, output spec
  - test the recipe locally
  - save/export the recipe as a local capability
- Keep recipe execution local and deterministic for V0.9.
- Reuse V0.8 capability registry and run history for exported capabilities.
- Preserve existing workspace, memory, approval, automation, artifact, and capability behavior.

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [x] `cd product && npm run package:mac` succeeds.
- [x] User can create a recipe from a successful run.
- [x] User can edit recipe fields.
- [x] User can test a recipe.
- [x] Recipe can be saved/exported as a local capability.
- [x] Exported recipe capability can be rerun locally.
- [x] Packaged `AI OS.app` launches and shows the V0.9 Forge workflow without white screen regression.

## Non-Goals

- No public marketplace.
- No monetization.
- No organization templates.
- No community governance.
- No arbitrary third-party code execution.

## Technical Notes

- A V0.9 exported capability should be a local deterministic capability backed by a recipe.
- Do not introduce Forge marketplace or package installation yet.
- Keep all data in SQLite and scoped to the active workspace where applicable.
