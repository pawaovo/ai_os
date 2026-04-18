# Package V0.1 Desktop App

## Goal

Close the V0.1 delivery gap by producing a clickable macOS app bundle for AI Space Demo.

The previous V0.1 demo was browser-accessible at `http://localhost:5173`. This task must create a real `.app` bundle that opens a native desktop window and loads the same V0.1 Space loop.

## Requirements

- Add a package command under `product/` for building a macOS app bundle.
- Generate a clickable app at:

```text
product/build/AI OS.app
```

- The app opens its own native window, not the user's default browser.
- The app starts the local Space Demo server internally.
- The packaged app uses the existing V0.1 demo surface and runtime.
- The app supports the existing executor choices:
  - Mock local executor.
  - Codex local CLI.
  - Claude Code local CLI.
- The package output must not be committed to git.
- Keep the solution lightweight; do not introduce Electron/Tauri or a full packaging platform for V0.1.

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm run package:mac` creates `product/build/AI OS.app`.
- [x] The app bundle contains a compiled macOS executable.
- [x] The app bundle contains the compiled Space Demo web assets and package runtime.
- [x] Starting the app opens a desktop window.
- [x] Packaged server resources can serve the demo page.
- [x] Build outputs are ignored and not committed.

## Non-Goals

- No signed/notarized installer.
- No `.dmg` installer.
- No auto-update.
- No menu bar polish.
- No persistent database.
- No production-grade embedded runtime.
- No cross-platform Windows/Linux packaging in this task.

## Technical Notes

- Use Swift/AppKit/WebKit for the minimal macOS shell.
- Use the existing Node dev server as the local runtime.
- Package only the compiled assets and package runtime needed by the demo.
- The packaged app may require Node to be available on the user's machine for V0.1.
