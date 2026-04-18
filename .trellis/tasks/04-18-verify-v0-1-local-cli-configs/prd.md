# Verify V0.1 App Local CLI Configs

## Goal

Validate the packaged V0.1 app against the user's local Codex and Claude Code CLI configuration without exposing configured URLs or API keys.

## Requirements

- Do not print API keys or configured provider URLs.
- Validate local config files exist and parse.
- Rebuild and launch `product/build/AI OS.app`.
- Verify the app page loads.
- Verify Provider Settings API is reachable.
- Verify mock executor path succeeds.
- Verify Codex executor path through the app succeeds.
- Verify Claude Code executor path through the app and record whether failure is app-side or provider-side.
- Improve diagnostics if the app hides the real failure reason.

## Acceptance Criteria

- [x] Config files were checked without printing secrets.
- [x] `npm test` passes.
- [x] `npm ci --ignore-scripts --dry-run` passes.
- [x] `npm run package:mac` rebuilds `AI OS.app`.
- [x] App page loads after launch.
- [x] Mock executor path succeeds.
- [x] Codex executor path succeeds.
- [x] Claude Code path reports actionable provider-side failure details.
- [x] No tracked build output is committed.

## Result

- Codex path completed and returned `OK`.
- Claude Code path launched but received repeated `system/api_retry` events with HTTP 503 `server_error`; the app now surfaces that provider-side detail instead of only reporting a generic timeout.
