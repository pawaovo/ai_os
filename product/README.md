# AI OS Product Monorepo

This directory hosts the current AI OS product code.

The repository root above this directory is still a preparation workspace with product docs and reference projects. Product runtime code lives here and must not depend on `reference_projects/`.

The current product is `AI OS Personal`: a local-first desktop assistant with `AI Space` for day-to-day use and `AI Forge` for turning proven local workflows into reusable capabilities.

## Current Product State

The current V1.0 product includes:

- Electron desktop shell for macOS and Windows
- local SQLite-backed product state
- local secret storage through macOS Keychain, Electron `safeStorage`, or Windows protected files
- provider-backed chat through OpenAI-compatible and Anthropic-compatible APIs
- local workspaces, threads, runs, approvals, artifacts, automations, memory, capabilities, and Forge recipes
- mock, Codex CLI, and Claude Code CLI executor paths

## Product Surfaces

- `Start`: readiness summary and recommended next actions
- `Space`: workspace selection, trust level, and thread list
- `Chat`: provider-backed assistant conversation
- `Runs`: task execution, transcripts, events, approvals, and artifacts
- `Automations`: proactive local follow-ups
- `Artifacts`: saved outputs and notes
- `Approvals`: audit trail and current approval request
- `Memory`: personal or workspace context records
- `Capabilities`: installed reusable local abilities and their permissions
- `Forge`: convert successful runs into reusable capabilities
- `Providers`: provider setup, doctor, and model loading
- `Settings`: surface summary, executor status, and install guidance

## Initial Packages

```text
apps/space-desktop
packages/kernel/kernel-objects
packages/kernel/kernel-events
packages/conversation/conversation-core
packages/conversation/conversation-runtime
packages/companion/companion-core
packages/control/control-plane
packages/workspace/workspace-core
packages/workspace/artifact-core
packages/model-providers/provider-protocol
packages/model-providers/provider-registry
packages/model-providers/provider-openai-compatible
packages/model-providers/provider-anthropic-compatible
packages/executors/executor-protocol
packages/executors/executor-codex
packages/executors/executor-claude-code
```

`packages/companion/companion-core` is the minimal Companion boundary. It accepts a user goal, delegates mission execution to an injected Control Plane facade, and returns a mission or run status summary. Companion code must not call executors directly.

The adapter packages stay intentionally thin:

```text
packages/model-providers/provider-openai-compatible
packages/model-providers/provider-anthropic-compatible
packages/executors/executor-codex
packages/executors/executor-claude-code
```

Provider adapters support mockable OpenAI-compatible and Anthropic-compatible calls without SDK dependencies. Executor adapters define Codex and Claude Code process-runner paths and normalize supported JSONL or stream-json events into kernel events.

`apps/space-desktop` now exposes the current Personal AI OS surface and keeps the browser UI intentionally lightweight without introducing a full UI framework.

## Try The Current Product

```bash
cd product
npm ci
npm test
npm run desktop:dev
```

Then walk through this first-run path:

1. `Start`: confirm readiness loads and see what is still missing.
2. `Space`: create a workspace and choose strict approval or trusted local writes.
3. `Providers`: save a provider, run `Doctor`, and load models.
4. `Chat`: send a real message and confirm the transcript persists.
5. `Runs`: execute a mock or real executor task and inspect transcript, approvals, and artifacts.
6. `Memory`: save one local memory record.
7. `Automations`: create a local reminder or heartbeat task.
8. `Forge`: convert a completed run into a reusable capability.

## Expected Results When You Use It

After a successful end-to-end manual trial, you should expect:

- a locally saved workspace and trust choice
- saved provider metadata with the secret kept out of browser-visible payloads
- persistent threads and messages in the local database
- run history with normalized events and optional approval decisions
- artifacts created by manual notes, chat, or executor work
- at least one memory and optional automation stored locally
- a path from a successful run to a repeatable local capability through Forge

## Local Data And Secrets

Provider metadata, workspaces, threads, messages, runs, approvals, automations, memory, artifacts, capabilities, and Forge recipes are stored locally under the product profile. In the non-Electron browser or server path the default development database is:

```text
~/.ai_os/space-demo/app.db
```

Provider API keys are stored separately from normal browser-visible state:

- macOS Electron and non-Electron development: Keychain
- Other Electron builds: OS-backed `safeStorage`
- Non-Electron Windows development: protected local files
- Test override: `AI_SPACE_SECRET_BACKEND=file`

Executor choices:

- `Mock local executor`: deterministic and safe default for repeatable manual testing
- `Codex local CLI`: runs through the local dev server and the `@ai-os/executor-codex` process adapter when `codex` is installed
- `Claude Code local CLI`: runs through the local dev server and the `@ai-os/executor-claude-code` process adapter when `claude` is installed

Real executor calls are bounded by a demo timeout. Override it when needed:

```bash
cd product
AI_SPACE_EXECUTOR_TIMEOUT_MS=120000 npm run desktop:dev
```

## Build The Electron Desktop App

```bash
cd product
npm run package:mac
```

Packaged Electron app outputs:

```text
Apple Silicon macOS: product/build/electron/mac-arm64/AI OS.app
Intel macOS:         product/build/electron/mac/AI OS.app
Windows unpacked:    product\build\electron\win-unpacked\AI OS.exe
```

Open the macOS packaged app with:

```bash
open "build/electron/mac-arm64/AI OS.app"   # Apple Silicon
open "build/electron/mac/AI OS.app"         # Intel Mac
```

The product desktop shell is Electron. It uses one desktop architecture for macOS and Windows, opens a locked-down Chromium renderer, and starts the local AI OS server inside the Electron main process. The legacy macOS WebKit package path remains only as a rollback fallback and now lives under `product/build/webkit/AI OS.app`, so it does not shadow the primary Electron app.

Windows packaging is configured with Electron Builder:

```bash
cd product
npm run package:win
```

Run `npm run validate:electron` on any host to statically verify the macOS and Windows Electron packaging configuration. Production distribution still needs signing, notarization on macOS, Windows code signing, and auto-update.

## Current Limits

- Local builds are unsigned and unnotarized
- No auto-update yet
- No cloud sync or hosted runtime
- No team collaboration or marketplace
- No hardened managed executor lifecycle beyond the current local process path

The workspace and artifact core packages stay intentionally narrow: reference creation and artifact-to-run or artifact-to-space linking only, with no full file synchronization pipeline yet.
