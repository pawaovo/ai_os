# P9.1 Real Executor Stabilization

## Goal

Stabilize the current real Codex / Claude Code executor path so process-level failures, timeouts, and interruptions end in a consistent product state instead of dropping out of the normal run history and artifact fallback flow.

## Requirements

- Keep the work additive and avoid inventing a new executor protocol.
- Preserve the current compatibility contract:
  - process-cli transport
  - product-pre-run approval bridge
  - fallback-only artifact collection
  - product-pre-run continuation
- Normalize real executor process failures into terminal run events whenever safe.
- Make failed real runs still produce consistent run history and fallback transcript artifacts through the existing product path.
- Keep bilingual support for any new user-facing text.
- Keep packaged Electron validation in scope.

## Acceptance Criteria

- [x] Codex and Claude process adapters emit a terminal failure event for normal runner failures instead of only throwing through the product layer.
- [x] Product run flow continues to persist fallback artifacts for failed real executor runs when the executor process reached the product layer.
- [x] Abort / interrupt behavior remains explicit and does not regress into false success.
- [x] Tests cover adapter-level failure normalization and product-level failed-run fallback persistence.
- [x] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
- [x] Packaged smoke confirms the app still boots and run history remains usable after the stabilization changes.

## Technical Notes

- Prefer adapter-level normalization over extra product-side special cases.
- Reuse the existing terminal kernel event contract and existing artifact persistence path.
- Be careful with error text: sanitize or reuse already-sanitized process output paths so failure messages do not leak secrets.
