# AI OS Space Desktop

Local-first desktop app for AI OS Personal. The product desktop shell is Electron so the same app architecture supports macOS and Windows.

Electron is now the primary product path:

- macOS: packaged by `electron-builder` into `product/build/electron/mac-arm64/AI OS.app` on Apple Silicon.
- Windows: configured by `electron-builder` with NSIS and portable targets through `npm run package:win`.
- Legacy macOS WebKit packaging remains available as `npm run package:mac:webkit` only as a rollback/development fallback.

## Runtime Architecture

- Electron main process owns desktop lifecycle, single-instance behavior, window creation, local port allocation, and navigation restrictions.
- Electron renderer loads the existing AI OS browser UI from the local server.
- The existing local AI OS server is imported inside the Electron main process, so packaged Electron builds do not require a separately installed Node runtime.
- Renderer security defaults are locked down: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and `webSecurity: true`.
- Electron builds use OS-backed `safeStorage` for provider secrets. Non-Electron macOS development uses Keychain; Windows non-Electron development uses user-scoped DPAPI-protected files.

User data stays local by default:

- Provider metadata, workspaces, threads, messages, runs, approvals, automations, memory, artifacts, capabilities, and Forge recipes are stored in SQLite under Electron `userData` when launched from Electron.
- Provider API keys are encrypted locally and are not returned to the browser after saving.
- Test builds may opt into `AI_SPACE_SECRET_BACKEND=file`.

## V1.0 Capabilities

The V1.0 app includes:

- Daily provider-backed chat with persistent workspace-scoped threads.
- Custom OpenAI-compatible and Anthropic-compatible provider configuration.
- Provider Doctor and model loading.
- Local workspaces with strict or trusted-local-writes trust modes.
- Mock, Codex CLI, and Claude Code CLI executor paths.
- Approval and trust UI for risky execution.
- Persistent run history, run events, and saved artifacts.
- Local automations for one-off, scheduled, and heartbeat follow-ups.
- Local memory with personal/workspace scope and sensitivity labels.
- Safe local capability registry, permission inspection, enable/disable, run history, and artifacts.
- AI Forge recipe flow: create recipe from a completed run, edit/test it, export it as a local capability, and rerun it.
- V1.0 Start dashboard with readiness checks and local install status.

## Electron Install Paths

From the repository root:

```bash
cd product
npm ci
npm test
npm run package:mac
open "build/electron/mac-arm64/AI OS.app"
```

Windows packaging is configured from the same project:

```bash
cd product
npm run package:win
```

The Windows command is intended to run on a Windows build host for production artifacts. On macOS, use `npm run validate:electron` to statically verify the Windows target configuration.

## Development Commands

Run the browser/server development app without Electron:

```bash
cd product
npm run dev
```

Run the Electron desktop app in development:

```bash
cd product
npm run desktop:dev
```

Validate Electron packaging configuration:

```bash
cd product
npm run validate:electron
```

Use a larger timeout for real executor experiments:

```bash
cd product
AI_SPACE_EXECUTOR_TIMEOUT_MS=120000 npm run desktop:dev
```

Use isolated storage for testing:

```bash
cd product
AI_SPACE_STORAGE_DIR=/tmp/ai-os-space-test AI_SPACE_SECRET_BACKEND=file npm run desktop:dev
```

## Runtime Requirements

- macOS or Windows for the Electron app.
- Optional: Codex CLI on `PATH` for Codex executor runs.
- Optional: Claude Code CLI on `PATH` for Claude executor runs.
- Provider API key and compatible base URL if using real chat.

The local Electron build is not signed or notarized. A production distribution should add Apple certificate signing, notarization, Windows code signing, and auto-update.

The Electron app entry lives in:

```text
product/apps/space-desktop/electron-app/
```

## Troubleshooting

- White screen: open Start or check that `/api/app/readiness` responds from the local port shown in the Electron app process.
- Provider chat fails: open `Providers`, save provider metadata and key, run `Doctor`, then load `Models`.
- Codex or Claude is unavailable: open `Runs` or `Settings` and check `Executor Status`; install or expose the CLI on `PATH`.
- Data looks stale: Electron uses its app `userData` profile by default; use `AI_SPACE_STORAGE_DIR` for isolated test profiles.
- Secret storage issues: re-save the provider key from `Providers`; API keys are encrypted locally and never rendered back into the UI.
