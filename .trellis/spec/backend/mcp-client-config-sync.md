# MCP Client Config Sync

> Executable contract for local MCP client configuration, workspace overrides, and resolved config projection.

## Scenario: Local MCP Config Projection

### 1. Scope / Trigger

- Trigger: changing `product/apps/space-desktop/scripts/dev-server.mjs` MCP config routes, persistence, or resolution.
- Trigger: changing `product/apps/space-desktop/src/browser.ts` MCP settings UI behavior.
- Trigger: changing MCP config tests in `product/tests/space-desktop.test.mjs`.

### 2. Signatures

#### Routes

- `GET /api/mcp/config`
- `PATCH /api/mcp/config`

#### Config Shapes

```ts
interface McpClientConfigRecord {
  enabled: boolean;
  transport: "stdio";
  command?: string;
  argsText?: string;
}

interface McpResolvedConfig extends McpClientConfigRecord {
  source: "global" | "workspace" | "none";
  args: string[];
  workspaceId?: string;
  health: {
    status: string;
    detail: string;
  };
  runtime?: McpRuntimeSummary;
}
```

#### Persistence

- global config under `app_settings.mcp_global_config_json`
- workspace override under `workspaces.mcp_config_json`

### 3. Contracts

- Base config ownership remains config-only.
- Real MCP runtime probing is additive and documented in `mcp-transport-runtime.md`.
- Resolved config source priority:
  1. workspace override
  2. global default
  3. none
- `transport` is fixed to `stdio` for this step.
- Health check is local-only and must not launch a long-lived MCP session.
- Workspace switching must change resolved config source accordingly.
- MCP config must remain separate from provider transport settings.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No config exists | resolved source is `none` and health is disabled/not configured | `space-desktop.test.mjs` |
| Global config exists | resolved source is `global` | `space-desktop.test.mjs` |
| Workspace override exists | resolved source is `workspace` | `space-desktop.test.mjs` |
| Workspace override command is missing on PATH | health degrades clearly to failed | `space-desktop.test.mjs` |
| Switch to workspace without override | resolved source falls back to global | `space-desktop.test.mjs` |

### 5. Good / Base / Bad Cases

#### Good

- User can see and save global default config.
- User can override config per workspace.
- User can see effective source and local health immediately.

#### Base

- Config remains additive and local-only.
- No external client files are written.

#### Bad

- Mixing MCP config into provider settings.
- Pretending transport execution is implemented when only config projection exists.
- Letting one workspace override leak into another.

### 6. Tests Required

- `cd product && node --test tests/space-desktop.test.mjs`
  - config resolution and scoping
- `cd product && npm test`

### 7. Wrong vs Correct

#### Wrong

- Build a fake MCP runtime before the config contract is stable.
- Treat provider base URL and MCP client command as the same configuration domain.

#### Correct

- Project local MCP config through global default and workspace override.
- Expose resolved config and local health.
- Keep the step narrow so later MCP transport work can extend it safely.
