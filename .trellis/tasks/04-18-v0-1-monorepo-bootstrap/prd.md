# Bootstrap AI OS V0.1 Monorepo And Core Protocols

## Goal

Create the first real product code workspace under `product/` without mixing it with `reference_projects/`.

This task is not to build the full application. It establishes the minimum TypeScript monorepo skeleton and the first protocol/type packages needed for AI OS V0.1.

## Product Context

V0.1 is the minimum skeleton of a general personal AI assistant, not a coding-only demo.

The architecture must preserve these first-class concerns:

- Normal chatbot conversations.
- Custom model providers using user supplied API URL and API key.
- OpenAI-compatible and Anthropic-compatible model provider protocols.
- Codex and Claude Code as first-class Code Executors.
- Space, Workspace, Thread, Mission, Run, Event, Approval, and Artifact as shared system concepts.

## Scope

Create a `product/` monorepo with the initial package boundaries and minimal TypeScript source.

The first implementation should include:

- Root package/workspace configuration.
- Shared TypeScript configuration.
- Core object types.
- Core event types.
- Conversation types.
- Model provider protocol.
- Executor protocol.
- README placeholders for first adapter packages.

## Must Create

At minimum:

```text
product/
  package.json
  tsconfig.base.json
  README.md

  apps/
    space-desktop/

  packages/
    kernel/
      kernel-objects/
      kernel-events/

    conversation/
      conversation-core/

    model-providers/
      provider-protocol/
      provider-openai-compatible/
      provider-anthropic-compatible/

    executors/
      executor-protocol/
      executor-codex/
      executor-claude-code/
```

## Non-Goals

Do not implement:

- Real UI.
- Real desktop shell.
- Real API calls.
- Real Codex or Claude Code process integration.
- Database schema or migrations.
- Forge product shell.
- Store, registry, marketplace, or publishing.
- Cloud runtime.
- Team permissions.
- Complex swarm/multi-agent orchestration.
- Any modifications under `reference_projects/`.

## Acceptance Criteria

- `product/` is isolated from `reference_projects/`.
- Core packages have clear package names and exports.
- TypeScript source compiles.
- Provider protocol can represent OpenAI-compatible and Anthropic-compatible custom providers.
- Executor protocol can represent Codex and Claude Code through the same interface.
- Kernel objects include the V0.1 shared concepts.
- No runtime dependency on Codex, Claude Code, or third-party model SDKs yet.

## Verification

Run the lightest available validation from `product/`, preferably:

```bash
npm install
npm run typecheck
```

If dependency installation is skipped, at minimum verify file structure and TypeScript syntax with the available local tooling.
