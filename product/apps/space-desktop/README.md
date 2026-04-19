# AI OS Space Desktop

Local-first desktop app for the V1.0 Personal AI OS preview.

The app uses a lightweight native macOS WebKit shell that starts the local Node server bundled in `AI OS.app`. It is not Electron or Tauri. User data stays local by default:

- Provider metadata, workspaces, threads, messages, runs, approvals, automations, memory, artifacts, capabilities, and Forge recipes are stored in SQLite at `~/.ai_os/space-demo/app.db` unless `AI_SPACE_STORAGE_DIR` is set.
- Provider API keys are stored in macOS Keychain by default.
- Test builds may opt into `AI_SPACE_SECRET_BACKEND=file`; the normal app path uses Keychain.

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

## Local Install Path

From the repository root:

```bash
cd product
npm ci
npm test
npm run package:mac
open "build/AI OS.app"
```

The generated app is available at:

```text
product/build/AI OS.app
```

For a quick rebuild after dependencies are already installed:

```bash
cd product
npm run package:mac
open "build/AI OS.app"
```

## Runtime Requirements

- macOS 14 or newer.
- Node.js available on `PATH`; the current WebKit app starts the local server with `node`.
- Optional: Codex CLI on `PATH` for Codex executor runs.
- Optional: Claude Code CLI on `PATH` for Claude executor runs.
- Provider API key and compatible base URL if using real chat.

The V1.0 local build is not signed or notarized. If macOS blocks opening it, use Finder or `open "product/build/AI OS.app"` from a trusted local checkout. A production distribution should add certificate signing, notarization, and a bundled Node runtime.

## Useful Commands

Run the browser/server development app:

```bash
cd product
npm run dev
```

Use a larger timeout for real executor experiments:

```bash
cd product
AI_SPACE_EXECUTOR_TIMEOUT_MS=120000 npm run dev
```

Use isolated storage for testing:

```bash
cd product
AI_SPACE_STORAGE_DIR=/tmp/ai-os-space-test AI_SPACE_SECRET_BACKEND=file npm run dev
```

## Troubleshooting

- White screen: verify the local server is running by opening `http://127.0.0.1:5174` for the packaged app or `http://127.0.0.1:5173` for `npm run dev`.
- Provider chat fails: open `Providers`, save provider metadata and key, run `Doctor`, then load `Models`.
- Codex or Claude is unavailable: open `Runs` or `Settings` and check `Executor Status`; install or expose the CLI on `PATH`.
- Data looks stale: the default local database is `~/.ai_os/space-demo/app.db`; use `AI_SPACE_STORAGE_DIR` for isolated test profiles.
- Keychain issues: re-save the provider key from `Providers`; API keys are not returned to the browser after saving.
