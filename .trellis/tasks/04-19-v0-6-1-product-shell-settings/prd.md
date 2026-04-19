# V0.6.1 Product Shell And Settings

## Goal

Convert the V0.6 single long automation workbench into a real product shell with primary navigation and a Settings area, without changing the V0.6 backend capability set.

## Requirements

- Add main app navigation for:
  - Space
  - Chat
  - Runs
  - Automations
  - Artifacts
  - Approvals
  - Providers
  - Settings
- Keep all existing V0.6 features available.
- Show one focused page area at a time instead of exposing every panel in one long scroll.
- Add a Settings page that explains where provider, executor, workspace trust, automation, and diagnostics settings live.
- Preserve packaged macOS app behavior and local server behavior.

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [x] `cd product && npm run package:mac` succeeds.
- [x] App exposes primary navigation.
- [x] App exposes a Settings page.
- [x] Existing V0.6 automation, approval, run, provider, artifact, and workspace controls remain available.
- [x] Packaged `AI OS.app` launches and loads the V0.6.1 shell without white screen regression.

## Non-Goals

- No V0.7 memory system.
- No Windows desktop host.
- No Electron migration.
- No redesign of backend contracts.
- No complex preference persistence for the active page yet.

## Technical Notes

- Keep the current framework-free HTML/CSS/TypeScript frontend.
- Use client-side page switching with existing DOM panels.
- Do not introduce React/Electron/Tauri in this task.
