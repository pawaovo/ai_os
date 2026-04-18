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
packages/kernel/kernel-objects
packages/kernel/kernel-events
packages/conversation/conversation-core
packages/conversation/conversation-runtime
packages/model-providers/provider-protocol
packages/model-providers/provider-registry
packages/executors/executor-protocol
```

The adapter package directories are intentionally placeholders for the next step:

```text
packages/model-providers/provider-openai-compatible
packages/model-providers/provider-anthropic-compatible
packages/executors/executor-codex
packages/executors/executor-claude-code
```

## Non-Goals

This initial skeleton does not implement UI, database persistence, real model calls, real executor process integration, Forge, Store, cloud runtime, or team permissions.
