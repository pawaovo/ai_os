# V1.0 Personal AI OS

## Goal

Implement V1.0 from `ai_os/ai_os_docs/04-implementation-roadmap.md`: deliver the existing local-first AI OS capabilities as a stable, understandable desktop app that can be used as a daily personal assistant.

## Requirements

- Update the product shell from V0.9 preview to V1.0 Personal AI OS.
- Add a first-run daily assistant / readiness overview that explains what is configured and what the user can do next.
- Keep the existing page navigation and avoid returning to a single long scrolling page.
- Surface the main V1.0 capabilities in one place:
  - daily chat
  - custom providers and models
  - local workspaces
  - Codex / Claude Code executor workflow
  - artifacts
  - approval and trust controls
  - automations
  - local memory
  - capabilities
  - Forge recipes
- Provide a documented local install path for macOS because signing/notarization is not available in this local build flow.
- Preserve existing V0.2 through V0.9 behavior.
- Keep all data local-first.

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [x] `cd product && npm run package:mac` succeeds.
- [x] Packaged `AI OS.app` opens without a white screen.
- [x] The app clearly identifies itself as V1.0 Personal AI OS.
- [x] The app includes a visible readiness / start-here panel.
- [x] The app shows whether workspace, provider, memory, automation, capability, Forge, and executor surfaces are available.
- [x] Local install instructions document how to build, open, troubleshoot, and what prerequisites remain.
- [x] Existing chat, run, approval, automation, memory, capability, and Forge tests still pass.

## Non-Goals

- No public marketplace.
- No cloud runtime.
- No enterprise team permissions.
- No multi-user organization administration.
- No complex swarm orchestration.
- No signing or notarization unless certificates are already available.

## Parallelization

- UI readiness shell and static tests can be done in parallel with install documentation.
- Backend status/readiness summary must be implemented before UI binding that depends on it.
- Packaging verification runs after all code and docs changes are complete.

## Technical Notes

- Prefer a small `/api/app/readiness` endpoint backed by existing store queries over adding new persistent state.
- The readiness summary should not expose provider API keys or sensitive local data.
- The V1.0 install path should document the current lightweight macOS WebKit shell and Node prerequisite rather than introduce Electron/Tauri.
