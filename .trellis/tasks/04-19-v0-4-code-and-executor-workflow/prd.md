# V0.4 Code And Executor Workflow

## Goal

Implement V0.4 from `ai_os/ai_os_docs/04-implementation-roadmap.md`: turn Codex and Claude Code from demo paths into usable coding executors inside AI OS without pulling the fuller V0.5 trust system or V0.6 automation into this version.

## Requirements

- Keep the existing local-first desktop architecture:
  - macOS WebKit shell
  - local Node server
  - SQLite persistence
  - provider and workspace model from V0.3
- Make executor choice visible and diagnosable:
  - executor availability doctor
  - clear status/error display for Codex and Claude Code
  - timeout visibility and basic timeout control
- Make executor runs feel product-grade:
  - real-time streaming output while a run is active
  - run cancellation from UI
  - persisted run/event/artifact records after completion or failure
- Add minimal approval pause/resume model for V0.4:
  - approval request object in run flow
  - approval panel in UI
  - grant/reject interaction
  - explicit paused / resumed / rejected states
- Improve artifact visibility for coding runs:
  - transcript artifact preview
  - changed file / diff-style artifact preview when available
  - clearer distinction between run artifacts and chat/manual artifacts
- Enforce workspace-safe execution defaults:
  - runs are tied to the selected workspace
  - executor cwd / task context come from active workspace
  - unsafe missing-workspace paths fail clearly
- Preserve V0.3 behavior:
  - workspace-scoped threads
  - provider persistence and Keychain handling
  - artifact and run history persistence

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [x] `cd product && npm run package:mac` succeeds.
- [x] User can run a Codex task against the selected workspace when Codex is available.
- [x] User can run a Claude Code task against the selected workspace when Claude Code is available.
- [x] User can see streaming executor output while the run is active.
- [x] User can cancel a running executor task from the UI.
- [x] Approval request can pause execution and user can grant/reject it in UI.
- [x] Run artifacts clearly show transcript and file/diff style output when available.
- [x] Packaged `AI OS.app` can launch and show the V0.4 executor workflow without white screen regression.

## Non-Goals

- No full V0.5 trust policy engine or approval history center.
- No multi-executor swarm or executor marketplace.
- No remote executor pool.
- No full Forge capability authoring.
- No automation or heartbeat scheduling in this version.

## Technical Notes

- Continue using CLI adapters as the default production path for V0.4.
- Any Codex app-server JSON-RPC or Claude SDK investigation must stay behind the `CodeExecutor` boundary.
- Approval should be minimal and product-visible in V0.4, but richer trust/risk policy remains a V0.5 task.
- Tests should cover mock approval/cancel paths without requiring real Codex or Claude availability.
