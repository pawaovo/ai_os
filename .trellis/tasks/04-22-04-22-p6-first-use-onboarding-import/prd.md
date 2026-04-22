# P6 First Use Onboarding And Import

## Goal

Improve the first-use experience for AI OS Personal so a user can understand setup status faster, import existing local Codex-compatible provider config with one action, see local executor discovery clearly, and clean up generated local test/demo data without manually touching the profile.

## Requirements

- Add a first-use onboarding/setup surface to the product shell.
- Keep the experience local-first and additive.
- Discover local environment state for:
  - Codex CLI
  - Claude Code CLI
  - Codex local config/auth files when available
- Allow importing a provider from discovered local Codex config without exposing the raw API key to the renderer.
- Add a safe local data reset action for generated product data.
- Preserve bilingual support for all new UI copy.
- Keep the existing Start, Space, Providers, and Settings flows working.

## Acceptance Criteria

- [ ] Start or Settings exposes an onboarding/setup surface with clear next actions.
- [ ] The app can detect local Codex/Claude availability and summarize discovered Codex config state.
- [ ] The user can import a provider from local Codex config in one action.
- [ ] The app exposes a reset action for generated local data with explicit confirmation.
- [ ] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
- [ ] Packaged app smoke confirms onboarding/import/reset UI renders and language switching still works.

## Technical Notes

- Prefer backend-owned discovery/import endpoints; do not read sensitive local config directly in browser code.
- Imported provider secrets must continue to flow through the existing secret-store path.
- Reset behavior should preserve built-in capabilities and avoid corrupting the packaged app profile structure.
