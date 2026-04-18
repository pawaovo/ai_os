# V0.2 Polish Provider And Thread Controls

## Goal

Complete the remaining V0.2 user controls for the Secure Chat Assistant.

## Requirements

- Add provider delete control.
- Add thread rename control.
- Add thread delete control.
- Add model selector dropdown populated from Provider Doctor/model loading.
- Keep manual model input fallback.
- Keep existing V0.2 persistence and Keychain behavior.
- Rebuild and verify `product/build/AI OS.app`.

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [x] `cd product && npm run package:mac` succeeds.
- [x] User can delete a provider.
- [x] Deleting a provider removes the related secret.
- [x] User can rename a thread.
- [x] User can delete a thread.
- [x] Model selector can be populated from Provider Doctor/model loading.
- [x] Manual model input fallback still exists.
- [x] Existing mock executor path still succeeds.

## Non-Goals

- No workspace file execution.
- No approval UI.
- No automation.
- No Forge.
- No provider marketplace.
