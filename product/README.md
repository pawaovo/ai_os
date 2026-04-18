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

Executor choices:

- `Mock local executor`: deterministic and safe default for repeatable manual testing.
- `Codex local CLI`: runs through the local dev server and the `@ai-os/executor-codex` process adapter when `codex` is installed.
- `Claude Code local CLI`: runs through the local dev server and the `@ai-os/executor-claude-code` process adapter when `claude` is installed.

Real executor calls are bounded by a demo timeout. Override it when needed:

```bash
AI_SPACE_EXECUTOR_TIMEOUT_MS=120000 npm run dev
```

## Build The V0.1 macOS App

```bash
npm run package:mac
open "build/AI OS.app"
```

The generated app bundle is:

```text
product/build/AI OS.app
```

This V0.1 app opens a native macOS window using WebKit and starts the local Space Demo server internally. It is intentionally not signed, notarized, or packaged as a `.dmg` yet. The V0.1 app expects Node to be available on the local machine, because the bundled desktop shell still uses the local Node server runtime.

## Non-Goals

This V0.1 build does not implement database persistence, real model network smoke tests, managed executor process lifecycle, signed installer packaging, Forge, Store, cloud runtime, or team permissions.

The workspace/artifact core packages stay intentionally narrow in V0.1: reference creation and artifact-to-run/space linking only, with no database layer, file synchronization, or preview pipeline.
