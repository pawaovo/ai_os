# Space Desktop

Thin desktop product shell for AI Space.

Phase 10 keeps this package intentionally small:

- Pure TypeScript shell model, no UI framework.
- Fixed app shell sections for chat, run status, and artifact list.
- `createSpaceDesktopShellModel()` for assembling the minimal app state consumed by later UI work.

V0.1 still does not implement the real desktop UI here. The package only defines the smallest app-shell shape needed to connect Space concepts to future rendering work.
