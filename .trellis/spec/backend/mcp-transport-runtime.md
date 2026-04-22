# MCP Transport Runtime

> Executable contract for the first real MCP stdio runtime probe layered on top of the existing config projection.

## Scenario: MCP Runtime Probe

### 1. Scope / Trigger

- Trigger: changing `product/apps/space-desktop/scripts/mcp-runtime.mjs`.
- Trigger: changing `GET /api/mcp/config` or `PATCH /api/mcp/config` runtime fields.
- Trigger: changing `GET /api/agent-runtimes` MCP runtime projection.
- Trigger: changing the Settings MCP panel or Agent Runtime Registry rendering for runtime probe metadata.
- Trigger: changing Electron packaged resources that must include MCP runtime helper files.

### 2. Signatures

#### Product APIs

- `GET /api/mcp/config`
- `PATCH /api/mcp/config`
- `GET /api/agent-runtimes`

#### Runtime Shapes

```ts
interface McpRuntimeSummary {
  transport: "stdio";
  status: string;
  detail: string;
  probedAt: string;
  toolCount?: number;
  serverName?: string;
  serverVersion?: string;
}

interface McpResolvedConfig extends McpClientConfigRecord {
  source: "global" | "workspace" | "none";
  args: string[];
  workspaceId?: string;
  health: {
    status: string;
    detail: string;
  };
  runtime: McpRuntimeSummary;
}
```

#### Agent Runtime Registry Extension

```ts
interface AgentRuntimeSummary {
  id: string;
  kind: string;
  title: string;
  source: string;
  available: boolean;
  status: string;
  detail: string;
  mcpRuntime?: McpRuntimeSummary;
}
```

#### Electron Packaged Resource

- `product/apps/space-desktop/scripts/mcp-runtime.mjs` must be copied into packaged Electron resources beside `dev-server.mjs`.

### 3. Contracts

- MCP config persistence remains unchanged:
  - global config under `app_settings.mcp_global_config_json`
  - workspace override under `workspaces.mcp_config_json`
- `resolvedConfig.health` remains the config-layer health projection:
  - enabled / disabled
  - command present / missing
  - command availability on PATH
- `resolvedConfig.runtime` is additive and probe-only:
  - short-lived stdio spawn
  - automatic initialize via official MCP client
  - `listTools()` when server advertises tools capability
  - explicit cleanup through `client.close()`
- Runtime probe must not create a persistent MCP session manager.
- Runtime probe must not redefine workspace, run, artifact, or approval ownership.
- Runtime probe should be short-cached in-process so `/api/mcp/config` and `/api/agent-runtimes` do not spawn duplicate probes for the same resolved config within the same refresh burst.
- `GET /api/agent-runtimes` must consume the same MCP projection as `/api/mcp/config` so Settings and Agent Hub do not drift.
- `transport` remains fixed to `stdio` for this step.
- `argsText` must support quoted and escaped segments when resolving `args[]`.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No MCP config exists | `resolvedConfig.health.status = disabled` and `resolvedConfig.runtime.status = disabled` | `space-desktop.test.mjs` |
| Global config points to a real MCP stdio server | config health stays `ready`; runtime becomes `ready` with `serverName`, `serverVersion`, and `toolCount` | `space-desktop.test.mjs` |
| Workspace override points to missing command | config health is `failed`; runtime is `failed` without pretending a transport session exists | `space-desktop.test.mjs` |
| MCP server initialize or tools probe times out | config health can remain `ready`; runtime degrades to `failed` with timeout detail | `space-desktop.test.mjs` |
| Args contain quotes or escaped spaces | `resolvedConfig.args` preserves intended argument boundaries | `space-desktop.test.mjs` |
| Packaged Electron app starts | packaged app can import `mcp-runtime.mjs` and `/api/mcp/config` returns runtime payload | `npm run package:mac` + packaged smoke |

### 5. Good / Base / Bad Cases

#### Good

- User can save MCP config and immediately see both config health and real runtime status.
- Agent Runtime Registry shows the same MCP runtime state as Settings.
- Packaged Electron app exposes the same MCP runtime surface as local dev server runs.

#### Base

- First transport step is still read-only.
- Runtime probe only lists tools and reports server metadata.
- No tool calls are executed from product flows yet.

#### Bad

- Overwriting config health with transport probe status.
- Launching a long-lived MCP background manager for this step.
- Returning different MCP state from Settings and Agent Hub.
- Forgetting to ship `mcp-runtime.mjs` inside packaged Electron resources.

### 6. Tests Required

- `cd product && npm test`
  - assert real MCP stdio probe success
  - assert timeout behavior is separated from config health
  - assert quoted args parsing
  - assert Agent Hub runtime projection
- `cd product && npm run validate:electron`
  - assert packaged Electron resource list includes `mcp-runtime.mjs`
- `cd product && npm run package:mac`
  - assert packaged app still builds on host
- Packaged smoke:
  - launch `build/electron/mac-arm64/AI OS.app/Contents/MacOS/AI OS`
  - wait for `GET /api/app/readiness`
  - assert `GET /api/mcp/config` returns `resolvedConfig.runtime`
  - assert `/` includes MCP runtime surface ids

### 7. Wrong vs Correct

#### Wrong

- Treat `health.status = ready` as proof that MCP transport is usable.
- Re-probe the same config repeatedly in one renderer refresh burst.
- Ship a dev-only helper file but forget to include it in Electron packaging.

#### Correct

- Keep config health and runtime probe as two distinct layers.
- Reuse one short-lived probe projection for Settings and Agent Hub.
- Guard packaged Electron resources and smoke-test the packaged app after adding runtime helpers.
