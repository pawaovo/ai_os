# Electron Cross-Platform Desktop

## Goal

Move AI OS from the current macOS-only native WebKit shell to an Electron desktop product architecture that supports macOS and Windows from the same app shell.

## Why Electron

Electron is the target architecture for this product because AI OS needs:

- one production desktop shell for macOS and Windows
- consistent Chromium rendering across platforms
- mature app lifecycle APIs
- mature packaging and auto-update path
- access to OS-backed secure storage through Electron APIs
- a practical route to Windows distribution without rewriting the product UI

This task should not introduce a weaker fallback architecture. The current macOS WebKit shell can remain as a legacy development fallback, but the product packaging path should become Electron.

## Requirements

- Add an Electron main process for `AI OS`.
- Keep the existing local Node server and browser UI as the product runtime to avoid rewriting core product behavior.
- Launch the local AI OS server from Electron and load it in a secure `BrowserWindow`.
- Use secure BrowserWindow defaults:
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - `sandbox: true`
  - no remote module
- Add package scripts for:
  - Electron development launch
  - Electron macOS packaging
  - Electron Windows packaging
  - Electron cross-platform config validation
- Add `electron-builder` configuration for macOS and Windows outputs.
- Keep `npm test` passing.
- Keep existing V1.0 functionality intact.
- Update docs so the user understands that Electron is now the product desktop shell.

## Acceptance Criteria

- [ ] A clean GitHub baseline exists before code migration starts.
- [ ] `cd product && npm test` passes.
- [ ] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [ ] Electron app can open on macOS without white screen.
- [ ] Electron app loads the V1.0 Personal AI OS dashboard.
- [ ] Electron app can reach `/api/app/readiness`.
- [ ] Electron packaging configuration includes macOS and Windows targets.
- [ ] macOS Electron package command succeeds on this machine.
- [ ] Windows package configuration is statically validated on this machine.
- [ ] README documents macOS and Windows usage paths.
- [ ] Existing macOS WebKit package script is not the primary product path anymore.

## Non-Goals

- No full UI rewrite.
- No cloud runtime.
- No marketplace.
- No auto-updater in this task.
- No Windows runtime smoke on macOS host.
- No code signing/notarization unless certificates are already available.

## Architecture Plan

1. Product shell: Electron.
2. Renderer: existing static browser UI served by the local AI OS server.
3. Backend: existing `dev-server.mjs`, launched as a child process by Electron for this migration step.
4. Storage: existing local SQLite and secret backends continue to work; future work should move Electron builds to OS-backed `safeStorage` or an Electron-mediated secret bridge for best cross-platform secret handling.
5. Packaging: `electron-builder` with macOS and Windows targets.

## Risk Controls

- Commit and push this PRD before modifying runtime code.
- Keep the existing macOS WebKit packaging script during migration for rollback.
- Add tests that validate Electron main process source/config without needing Windows on this host.
- Smoke-test the Electron app on macOS after packaging.
