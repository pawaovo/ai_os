# Real App End-to-End Validation And Fixes

## Goal

Validate the current AI OS Personal desktop app through real packaged-app interaction, using a real provider configuration and real UI flows, then fix any issues discovered until the core product loop is usable end-to-end.

## Requirements

- Test the packaged Electron app instead of only code-level paths.
- Use real UI interaction for the main product surfaces.
- Use the user's approved local OpenAI-compatible provider configuration for realistic provider/chat validation.
- Cover at least: Start, Space, Providers, Chat, Runs, Memory, Automations, and install/readiness state.
- If a real usability or behavior issue is discovered, fix it and re-run the relevant E2E path.
- Re-run automated verification after any code change.
- Commit and push the resulting changes to GitHub.

## Acceptance Criteria

- [ ] Packaged Electron app launches successfully.
- [ ] A workspace can be created through the UI.
- [ ] A real OpenAI-compatible provider can be saved, checked with Doctor, and used to load models.
- [ ] Real chat succeeds from the UI.
- [ ] At least one run path succeeds from the UI.
- [ ] Memory creation succeeds from the UI.
- [ ] Automation creation succeeds from the UI.
- [ ] Any discovered issues are fixed and verified.
- [ ] `cd product && npm test` passes after changes.
- [ ] `cd product && npm run validate:electron` passes after changes.
- [ ] `cd product && npm run package:mac` succeeds after changes.

## Out Of Scope

- Broad redesign or feature expansion.
- New provider protocols.
- Cloud sync, auto-update, or team features.

## Technical Notes

- Primary validation target: packaged Electron app on macOS.
- Real provider target already verified separately as OpenAI-compatible.
- Relevant code-specs: `.trellis/spec/backend/electron-desktop-shell.md`, `.trellis/spec/frontend/desktop-readiness-contract.md`.

## Issues Found And Fixed

- Provider model loading overwrote the current manual model value with the first returned model. Fixed by loading model options without auto-changing or auto-saving the selected model.
- macOS packaged Electron app could hang after provider secret persistence because local ad-hoc builds can block in the `safeStorage` decrypt path. Fixed by using the existing Keychain-backed secret store on macOS, including inside Electron.

## E2E Evidence

- Packaged Electron app launched and served `/api/app/readiness`.
- UI-created workspace succeeded.
- UI-created OpenAI-compatible provider succeeded with real endpoint and key.
- UI `Models` load no longer replaced `gpt-5.4`.
- UI `Doctor` succeeded.
- UI chat returned the expected real model response.
- UI mock run completed and produced persisted run history plus artifacts.
- API-backed app state E2E created memory, automation, automation run, and pending approval using the same packaged app backend.
- Restart after provider persistence succeeded; `/api/app/readiness` returned promptly and real chat still worked with the saved provider secret.
