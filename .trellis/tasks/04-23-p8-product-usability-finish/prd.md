# P8 Product Usability Finish

## Goal

Polish the current AI OS desktop product so the packaged app feels consistent and usable in real daily workflows, without expanding scope into new major modules.

## Requirements

- Keep the work additive and avoid new product surfaces.
- Prioritize user-facing polish over architecture refactors.
- Make Chinese mode fully Chinese for the existing core product surfaces and common runtime-generated text.
- Improve first-use defaults so localized UI does not keep showing English placeholder names or system-generated labels.
- Preserve the current local-first product model and existing backend APIs.
- Keep packaged Electron validation in scope for every change.

## Acceptance Criteria

- [x] Core product chrome and settings surfaces no longer show obvious residual English in Chinese mode for existing system-owned copy.
- [x] Common backend/runtime-generated labels and status text shown in the renderer are localized when they match known system-generated content.
- [x] First-use defaults such as workspace name and remote bridge principal follow the selected language.
- [x] Existing dynamic state refresh remains correct for mailbox, remote bridge, approvals, and readiness flows.
- [x] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
- [x] Packaged macOS smoke confirms Chinese mode is usable end-to-end without obvious mixed-language regressions on the touched flows.

## Technical Notes

- Prefer renderer-side localization of known system-generated names/messages instead of mutating stored user data.
- Use existing `i18n.ts`, `localizeKnownText(...)`, and render helpers instead of adding a parallel localization layer.
- Only touch packaging where the improvement is low-risk and immediately verifiable on the current machine.
