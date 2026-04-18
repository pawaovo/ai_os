# Space Desktop

Thin desktop product shell for AI Space.

V0.1 keeps this package intentionally small:

- Pure TypeScript shell model, no UI framework.
- Fixed app shell sections for chat, run status, and artifact list.
- `createSpaceDesktopShellModel()` for assembling the minimal app state consumed by later UI work.
- A browser-first local demo that can be started with `cd product && npm run dev`.

The local demo runs the first visible Space loop with a deterministic mock executor. It is not the final desktop app package, and it does not include persistence, cloud runtime, account management, or polished infinite-canvas behavior.
