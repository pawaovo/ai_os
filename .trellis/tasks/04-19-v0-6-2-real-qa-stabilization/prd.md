# V0.6.2 Real QA And Stabilization

## Goal

Stabilize the current V0.6.1 desktop app through real end-to-end validation before starting V0.7 memory work.

## Requirements

- Validate the current packaged app against real user flows:
  - workspace creation and selection
  - provider configuration shell
  - chat threads
  - executor runs
  - approval / trust
  - automations
  - artifacts
  - product shell navigation
- Fix any issues found during QA that block or materially degrade real usage.
- Preserve the current feature scope; do not start V0.7 memory work here.
- Rebuild and revalidate `AI OS.app` after fixes.

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [x] `cd product && npm run package:mac` succeeds.
- [x] Packaged app shell loads without white screen regression.
- [x] Workspace / run / approval / automation flows pass scripted QA.
- [x] Any bugs found during QA are fixed and revalidated.
- [x] Latest stabilized state is pushed to GitHub.

## Non-Goals

- No V0.7 memory features.
- No Windows host implementation.
- No Electron migration.
- No large redesign beyond stabilization fixes.

## Technical Notes

- Prefer fixing concrete problems found during QA over speculative cleanup.
- Keep changes scoped and test-backed.
