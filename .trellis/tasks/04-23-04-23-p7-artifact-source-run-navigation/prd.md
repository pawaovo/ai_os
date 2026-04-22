# P7 Artifact Source Run Navigation

## Goal

Improve artifact usability by letting a user jump from a saved artifact back to its source run and understand artifact provenance more clearly.

## Requirements

- Keep the change additive and local-first.
- Reuse existing artifact and run models; do not add new persistence.
- Surface source-run linkage in the Artifacts experience when `artifact.runId` exists.
- Allow opening the linked run directly from the artifact detail/list surface.
- Keep bilingual support for all new user-facing copy.

## Acceptance Criteria

- [ ] Artifact UI makes source run linkage visible when present.
- [ ] User can jump from a saved artifact to its source run in one action.
- [ ] Existing artifact open/delete/save flows remain intact.
- [ ] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
- [ ] Packaged app smoke confirms artifact-to-run navigation UI renders.

## Technical Notes

- Prefer browser-side reuse of the existing `openRun(...)` flow.
- Preserve current artifact selection and preview behavior.
- If new metadata is shown, prefer using existing `artifact.runId` and `artifact.source` fields.
