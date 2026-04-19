# V0.8 Capability System

## Goal

Implement V0.8 from `ai_os/ai_os_docs/04-implementation-roadmap.md`: make AI OS extensible through a safe local capability system without turning the app into an uncontrolled plugin runtime.

## Requirements

- Add a shared capability contract package.
- Add a local capability registry with built-in safe local capabilities.
- Add capability permissions declaration and inspection.
- Add enable/disable state for installed capabilities.
- Add capability execution wrapper:
  - run a local capability
  - create capability run record
  - create capability run events
  - create artifact output when applicable
- Add capability UI:
  - list installed capabilities
  - inspect metadata and permissions
  - enable/disable capability
  - run capability
  - inspect capability execution history
- Keep execution local-only for V0.8.
- Preserve V0.7 memory, V0.6 automation, V0.5 approval/trust, and V0.6.1 product shell behavior.

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [x] `cd product && npm run package:mac` succeeds.
- [x] App can register local capabilities.
- [x] User can inspect declared permissions.
- [x] User can enable/disable a capability.
- [x] User can run a simple local capability.
- [x] Capability execution creates run/events/artifacts history.
- [x] Packaged `AI OS.app` launches and shows the V0.8 capability workflow without white screen regression.

## Non-Goals

- No Forge recipe builder.
- No public marketplace.
- No arbitrary third-party code execution.
- No remote capability runtime.
- No community package manager.

## Technical Notes

- Built-in capabilities should stay deterministic and local for V0.8.
- Use our own `Capability Contract`; do not leak Pi or other upstream package semantics into product UI.
- Prefer safe read-oriented capabilities first.
