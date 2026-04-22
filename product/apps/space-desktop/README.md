# AI OS Space Desktop

Local-first desktop app for AI OS Personal. The product desktop shell is Electron so the same app architecture supports macOS and Windows.

Electron is now the primary product path:

- macOS: packaged by `electron-builder`
- Windows: configured by `electron-builder` with NSIS and portable targets through `npm run package:win`
- Legacy macOS WebKit packaging remains available as `npm run package:mac:webkit` only as a rollback or development fallback, and now outputs to `product/build/webkit/AI OS.app` so it cannot shadow the primary Electron app

## Runtime Architecture

- Electron main process owns desktop lifecycle, single-instance behavior, window creation, local port allocation, and navigation restrictions.
- Electron renderer loads the existing AI OS browser UI from the local server.
- The existing local AI OS server is imported inside the Electron main process, so packaged Electron builds do not require a separately installed Node runtime.
- Renderer security defaults are locked down: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and `webSecurity: true`.
- macOS builds use Keychain for provider secrets. Other Electron builds use OS-backed `safeStorage`; Windows non-Electron development uses user-scoped DPAPI-protected files.

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
- Local memory with personal or workspace scope and sensitivity labels.
- Safe local capability registry, permission inspection, enable or disable, run history, and artifacts.
- AI Forge recipe flow: create recipe from a completed run, edit and test it, export it as a local capability, and rerun it.
- V1.0 Start dashboard with readiness checks and local install status.

## Product Surfaces

- `Start`: readiness summary, recommended next actions, local system counts, and current desktop app packaging guidance.
- `Space`: workspace selection, workspace trust mode, and persistent thread list.
- `Chat`: provider-backed conversation and current transcript.
- `Runs`: local task execution with mock, Codex, or Claude Code plus transcript, events, and artifacts.
- `Automations`: one-off, scheduled, and heartbeat local follow-ups plus run history.
- `Artifacts`: saved outputs from chat, runs, and manual notes.
- `Approvals`: risk review panel for operations that require a human decision.
- `Memory`: personal or workspace memory records with scope and sensitivity labels.
- `Capabilities`: installed local capabilities, permission contract, enable or disable, and execution history.
- `Forge`: recipe-from-run flow for turning proven work into reusable local capabilities.
- `Providers`: OpenAI-compatible and Anthropic-compatible provider setup, doctor, and model loading.
- `Settings`: compact summary of surfaces, executors, workspace trust, and install path guidance.

## First Successful Trial

Use this order for the first end-to-end manual test:

1. Open `Start` and confirm the readiness panel loads.
   Expected result: you see action items for workspace, provider, and chat.
2. Open `Space` and create a workspace.
   Expected result: the workspace becomes active and thread or artifact state is now scoped.
3. Open `Providers`, save a real provider, run `Doctor`, then load models.
   Expected result: provider status and model choice become usable from Chat and Runs.
4. Open `Chat` and send a real message.
   Expected result: a multi-message thread persists in local storage and the model response appears in the transcript.
5. Open `Runs` and execute a mock or real executor task.
   Expected result: you get a run transcript, normalized events, and optionally an artifact.
6. Open `Memory` and save one personal or workspace memory.
   Expected result: memory appears in the local list and can be surfaced back into chat or run context.
7. Open `Automations` and create a simple one-off or heartbeat follow-up.
   Expected result: a local automation record and automation run history appear.
8. Open `Capabilities` and `Forge` after you have at least one completed run.
   Expected result: you can derive a recipe from the run, test it, export it as a capability, and rerun it locally.

## Expected Results

After a successful manual trial, you should have:

- at least one saved workspace with trust mode recorded locally
- at least one provider profile with the secret stored outside the browser view
- at least one persistent thread and message history in SQLite
- at least one run transcript and possibly a saved artifact
- at least one memory record and optional automation
- a clear path from a successful run to a reusable capability through Forge

## Electron Install Paths

From the repository root:

```bash
cd product
npm ci
npm test
npm run package:mac
```

Packaged Electron app paths:

```text
Apple Silicon macOS: product/build/electron/mac-arm64/AI OS.app
Intel macOS:         product/build/electron/mac/AI OS.app
Windows unpacked:    product\build\electron\win-unpacked\AI OS.exe
```

On macOS, open the packaged app with:

```bash
open "build/electron/mac-arm64/AI OS.app"   # Apple Silicon
open "build/electron/mac/AI OS.app"         # Intel Mac
```

Windows packaging is configured from the same project:

```bash
cd product
npm run package:win
```

The Windows command is intended to run on a Windows build host for production artifacts. On macOS, use `npm run validate:electron` to statically verify the Windows target configuration.

The `Desktop App Path` panel inside `Start` and `Settings` shows the current host's primary build command, open command, and Windows packaging command.

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

- macOS or Windows for the Electron app
- Optional: Codex CLI on `PATH` for Codex executor runs
- Optional: Claude Code CLI on `PATH` for Claude executor runs
- Provider API key and compatible base URL if using real chat

The local Electron build is not signed or notarized. A production distribution should add Apple certificate signing, notarization, Windows code signing, and auto-update.

The Electron app entry lives in:

```text
product/apps/space-desktop/electron-app/
```

## Troubleshooting

- White screen: open `Start` or check that `/api/app/readiness` responds from the local port shown in the Electron app process.
- Provider chat fails: open `Providers`, save provider metadata and key, run `Doctor`, then load `Models`.
- Codex or Claude is unavailable: open `Runs` or `Settings` and check `Executor Status`; install or expose the CLI on `PATH`.
- Data looks stale: Electron uses its app `userData` profile by default; use `AI_SPACE_STORAGE_DIR` for isolated test profiles.
- Secret storage issues: re-save the provider key from `Providers`; API keys are encrypted locally and never rendered back into the UI.
