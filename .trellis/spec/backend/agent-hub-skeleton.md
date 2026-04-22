# Agent Hub Skeleton

> Executable contract for the first read-only Agent Hub registry layer.

## Scenario: Agent Runtime Registry

### 1. Scope / Trigger

- Trigger: changing `GET /api/agent-runtimes`.
- Trigger: changing settings UI that renders the agent runtime registry.
- Trigger: changing how executors, installed Prompt App drafts, or MCP config are projected into a unified registry.

### 2. Signatures

#### Product API

```ts
GET /api/agent-runtimes
```

Returns:

```ts
{
  runtimes: AgentRuntimeSummary[];
}
```

### 3. Contracts

- Agent Hub skeleton is additive and read-only.
- Registry may aggregate:
  - executor runtimes
  - installed Prompt App drafts
  - MCP client projection
- Registry must not define a second workspace runtime or run/session model.
- Installed Prompt App entries must remain workspace-aware.
- MCP client entry must reflect resolved config and health, not real transport sessions.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| Active workspace has installed Prompt App draft | registry includes prompt-app entry | `space-desktop.test.mjs` |
| Switch to workspace without installed Prompt App | prompt-app entry disappears | `space-desktop.test.mjs` |
| Global MCP config healthy | registry includes ready MCP client entry | `space-desktop.test.mjs` |

### 5. Good / Base / Bad Cases

#### Good

- Registry shows current local runtimes without inventing orchestration.

#### Base

- First step remains settings-visible and read-only.

#### Bad

- Turning Agent Hub skeleton into a second run/session runtime.
- Mixing remote orchestration into the first registry step.

### 6. Tests Required

- `cd product && node --test tests/space-desktop.test.mjs`
  - assert agent runtime registry projection
- `cd product && npm test`
