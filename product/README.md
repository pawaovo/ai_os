# AI OS Product Monorepo

This directory is the first real product workspace for AI OS.

The repository root above this directory is a preparation workspace that contains product documents and reference projects. Product code should live here and must not depend on files under `reference_projects/`.

## V0.1 Goal

V0.1 proves the minimum skeleton of a general personal AI assistant:

- Normal chatbot conversations.
- Custom model providers through user supplied API URL and API key.
- OpenAI-compatible and Anthropic-compatible provider protocols.
- Codex and Claude Code as first-class Code Executors.
- Space, Workspace, Thread, Mission, Run, Event, Approval, and Artifact as shared concepts.

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

`packages/companion/companion-core` is the minimal Companion boundary for V0.1. It accepts a user goal, delegates mission execution to an injected Control Plane facade, and returns a mission/run status summary. Companion code must not call executors directly.

The adapter packages stay thin in V0.1:

```text
packages/model-providers/provider-openai-compatible
packages/model-providers/provider-anthropic-compatible
packages/executors/executor-codex
packages/executors/executor-claude-code
```

Provider adapters support mockable OpenAI-compatible and Anthropic-compatible calls without SDK dependencies. Executor adapters define Codex and Claude Code process-runner paths and normalize supported JSONL/stream-json events into kernel events; approval bridging, managed process lifecycle, and artifact extraction are later hardening work.

`apps/space-desktop` currently exposes a minimal TypeScript shell model for the Space desktop surface. It defines the first app-shell sections for chat, run status, and artifact list without introducing a UI framework.

## Run The V0.1 Space Demo

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

The demo is a browser-first local validation surface. It lets you enter a goal and run the V0.1 loop through Companion, Control Plane, normalized executor events, and artifact return.

Product preview capabilities:

- Configure an OpenAI-compatible or Anthropic-compatible model provider.
- Save provider name, protocol, API base URL, and model in local SQLite.
- Save provider API keys in macOS Keychain.
- Send real chat messages through the configured provider.
- Keep a multi-message chat transcript in the current app session.
- Run the executor/artifact demo path from the same app.

V0.2 provider metadata, thread list, and messages are stored locally under:

```text
~/.ai_os/space-demo/app.db
```

Provider API keys are stored separately in macOS Keychain using the provider id as the account key. Test builds may opt into `AI_SPACE_SECRET_BACKEND=file`, but the default app path uses Keychain.

Executor choices:

- `Mock local executor`: deterministic and safe default for repeatable manual testing.
- `Codex local CLI`: runs through the local dev server and the `@ai-os/executor-codex` process adapter when `codex` is installed.
- `Claude Code local CLI`: runs through the local dev server and the `@ai-os/executor-claude-code` process adapter when `claude` is installed.

Real executor calls are bounded by a demo timeout. Override it when needed:

```bash
AI_SPACE_EXECUTOR_TIMEOUT_MS=120000 npm run dev
```

## Build The Electron Desktop App

```bash
npm run package:mac
open "build/electron/mac-arm64/AI OS.app"
```

The generated macOS Electron app bundle is:

```text
product/build/electron/mac-arm64/AI OS.app
```

The product desktop shell is Electron. It uses one desktop architecture for macOS and Windows, opens a locked-down Chromium renderer, and starts the local AI OS server inside the Electron main process. The legacy macOS WebKit package path is still available as `npm run package:mac:webkit` for rollback only.

Windows packaging is configured with Electron Builder:

```bash
npm run package:win
```

Run `npm run validate:electron` on any host to statically verify the macOS and Windows Electron packaging configuration. Production distribution still needs signing, notarization on macOS, Windows code signing, and auto-update.

## Non-Goals

This V0.2 build does not implement managed executor process lifecycle, signed installer packaging, Forge, Store, cloud runtime, or team permissions.

The workspace/artifact core packages stay intentionally narrow in V0.1: reference creation and artifact-to-run/space linking only, with no database layer, file synchronization, or preview pipeline.
