# Space Desktop

Thin desktop product shell for AI Space.

V0.1 keeps this package intentionally small:

- Pure TypeScript shell model, no UI framework.
- Fixed app shell sections for chat, run status, and artifact list.
- `createSpaceDesktopShellModel()` for assembling the minimal app state consumed by later UI work.
- A browser-first local demo that can be started with `cd product && npm run dev`.

The local demo runs the first visible Space loop with a deterministic mock executor by default. It can also send goals to local Codex and Claude Code CLI adapters through the Node dev server. It is not the final desktop app package, and it does not include persistence, cloud runtime, account management, approval UI, or polished infinite-canvas behavior.

The V0.1 Product Preview also includes:

- Provider settings for OpenAI-compatible and Anthropic-compatible model providers.
- Local provider config persistence at `~/.ai_os/space-demo/provider.json`.
- Real chat requests through the configured provider.
- Session-local chat transcript rendering.

Provider API keys are stored in plain text for V0.1 preview only. Keychain-backed storage is intentionally deferred.

Use a larger timeout for longer real executor experiments:

```bash
AI_SPACE_EXECUTOR_TIMEOUT_MS=120000 npm run dev
```

Build the clickable V0.1 macOS app from `product/`:

```bash
npm run package:mac
open "build/AI OS.app"
```

The generated `.app` opens a native WebKit window and starts the local Space Demo server internally. For V0.1 it requires Node to be available on the machine and is not signed or notarized.
