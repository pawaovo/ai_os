# P11 Real Executor Success Loop

## Goal

Close the first real Codex success loop in the desktop product so a user can complete a real run, reuse that run's inputs for another attempt, and keep the follow-up flow verifiable through automated smoke coverage.

## Requirements

- Keep the change additive to the existing Runs surface and current real executor contract.
- Reuse the existing follow-up panel instead of inventing a second run form or a second run detail model.
- Let the user reuse a selected run's goal and executor choice for a fast retry.
- Add an automated real Codex success-path smoke that covers approval, completion, artifact persistence, and Forge recipe creation.
- Keep bilingual support for any new user-facing text.
- Keep packaged Electron validation in scope so the happy-path work does not regress the packaged app.

## Acceptance Criteria

- [x] The Runs follow-up panel exposes a reuse-input action for the selected run.
- [x] Reusing a run repopulates the current run form with the selected goal and executor without breaking the existing live-run state.
- [x] A real Codex smoke command validates approval, completion, transcript persistence, and recipe creation from the resulting run.
- [x] Static tests cover the new follow-up surface and smoke script contract.
- [x] `npm test`, `npm run validate:electron`, `npm run package:mac`, `npm run smoke:packaged:mac`, and `npm run smoke:real:codex` pass.

## Technical Notes

- Prefer reusing existing renderer state helpers over introducing new run form state.
- Keep the real smoke isolated with temporary storage so it does not pollute normal local product data.
- Treat the real Codex success smoke as a bounded happy-path guard, not as a replacement for broader manual exploratory testing.
