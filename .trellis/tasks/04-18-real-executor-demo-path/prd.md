# Enable Real Executor Demo Path

## Goal

Allow the V0.1 Space Demo App to run Codex and Claude Code from the local dev server, so the visible app can test the same high-level loop with real CLI executors:

```text
Browser Goal -> local dev server -> Companion -> Control Plane -> Codex/Claude adapter -> KernelEvents -> Space demo state
```

## Requirements

- Keep the existing mock executor path as the stable default.
- Add a local server API for demo runs.
- Enable `mock`, `codex`, and `claude-code` executor choices from the browser UI.
- Run real executor processes only from the Node dev server, not from browser code.
- Return a demo state that the browser can render consistently for all executor choices.
- Surface CLI availability and process failures as visible failed run state.
- Do not require real executor calls in automated tests.

## Acceptance Criteria

- [x] `cd product && npm run dev` starts the local app.
- [x] Selecting `Mock local executor` runs through the local server API.
- [x] Selecting `Codex` sends the goal to the Codex process adapter when `codex` is available.
- [x] Selecting `Claude Code` sends the goal to the Claude Code process adapter when `claude` is available.
- [x] The browser shows status, event stream, and artifact preview after a run.
- [x] Automated tests cover mock server runtime and disabled/failure paths without launching real Codex/Claude tasks.
- [x] `cd product && npm test` passes.

## Non-Goals

- No permanent process manager.
- No background jobs.
- No approval UI.
- No real artifact extraction from filesystem changes.
- No database persistence.
- No desktop packaging.
- No model provider settings UI.

## Technical Notes

- The dev server can use compiled package `dist` outputs after running `tsc -b`.
- Use a small Node process runner for CLI execution.
- Keep browser code limited to local HTTP calls and rendering.
- If real CLI runs produce no artifact event, the demo may wrap stream output into a local transcript artifact so the UI remains testable.
