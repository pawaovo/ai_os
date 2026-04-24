# P13 Lightweight Cleanup

## Goal

Perform a low-risk cleanup pass that reduces current maintenance friction without doing a large architectural refactor before the next round of real product usage.

## Requirements

- Keep the cleanup additive and low risk.
- Do not do a broad file-splitting refactor yet.
- Correct documentation that still describes the current product as V0.1 or WebKit-first when the shipped product is now Electron-first and well beyond that stage.
- Improve obvious low-efficiency initialization or refresh flows where the current code is serializing independent requests.
- Clean up a small number of clearly outdated demo-era strings or outputs that no longer match the current product identity.
- Preserve existing product behavior and packaging flow.

## Acceptance Criteria

- [x] The roadmap document no longer misstates the current product as V0.1/WebKit-first.
- [x] Frontend startup or workspace refresh avoids unnecessary serial loading for independent requests.
- [x] At least one clearly outdated demo-era runtime output string is aligned with the current product identity.
- [x] Existing tests and Electron validation still pass.

## Technical Notes

- This is a cleanup slice, not a full module-splitting pass.
- Prefer grouping independent loads with small helpers over introducing a new state architecture.
- Treat completed task PRDs as historical records unless a change is necessary for correctness.
