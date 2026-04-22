# P7 Run To Artifact Automation Forge Actions

## Goal

Improve the daily-use loop by letting a user take a completed run and quickly turn it into a saved artifact, a follow-up automation, or a Forge recipe without re-entering the same context manually.

## Requirements

- Add a run follow-up shortcut surface to the Runs experience.
- Keep the feature additive and local-first.
- Reuse existing product APIs:
  - `/api/artifacts`
  - `/api/automations`
  - `/api/recipes/from-run`
- Only enable follow-up actions for a completed selected run.
- Preserve run linkage when saving a follow-up artifact.
- Keep bilingual support for all new copy.

## Acceptance Criteria

- [ ] Runs page exposes a follow-up actions panel for the selected run.
- [ ] A completed run can be turned into a saved artifact with preserved `runId`.
- [ ] A completed run can create a follow-up automation.
- [ ] A completed run can create a Forge recipe.
- [ ] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
- [ ] Packaged app smoke confirms the follow-up panel renders for completed runs.

## Technical Notes

- Do not create a second run action backend subsystem unless the existing APIs are insufficient.
- Prefer refactoring browser-side creation helpers so the existing forms and follow-up shortcuts share request logic.
