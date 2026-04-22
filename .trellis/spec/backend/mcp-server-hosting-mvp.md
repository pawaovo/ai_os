# MCP Server Hosting MVP

> Executable contract for the first local stdio MCP hosted server exposed by AI OS.

## Scenario: Local Hosted MCP Server

### 1. Scope / Trigger

- Trigger: changing `product/apps/space-desktop/scripts/mcp-hosted-server.mjs`.
- Trigger: changing `GET /api/mcp/hosted-server`.
- Trigger: changing packaged Electron hosted-server entry behavior.
- Trigger: changing hosted MCP integration tests in `product/tests/space-desktop.test.mjs`.

### 2. Signatures

#### Product API

```ts
GET /api/mcp/hosted-server
```

Returns:

```ts
{
  hostedServer: HostedMcpServerSummary;
}
```

#### Summary Shape

```ts
interface HostedMcpServerSummary {
  status: string;
  transport: "stdio";
  detail: string;
  command: string;
  args: string[];
  commandLine: string;
  storageRoot: string;
  tools: Array<{
    name: string;
    title: string;
    description?: string;
  }>;
  resources: Array<{
    uri: string;
    title: string;
    description?: string;
  }>;
}
```

#### Hosted Server Entrypoints

- Dev / local browser server:

```bash
node product/apps/space-desktop/scripts/mcp-hosted-server.mjs --storage-dir <absolute-storage-root>
```

- Packaged Electron:

```bash
product/build/electron/mac-arm64/AI OS.app/Contents/MacOS/AI OS --mcp-hosted-server --storage-dir <absolute-storage-root>
```

### 3. Contracts

- Hosted server remains local-first and stdio-only in MVP.
- Hosted server must read existing AI OS storage rather than define a second product state store.
- Hosted server exports bounded product summaries only.
- MVP export set is fixed and read-only:
  - tools
    - `aios.workspace_summary`
    - `aios.recent_artifacts`
    - `aios.enabled_capabilities`
  - resources
    - `aios://workspace/active`
    - `aios://artifacts/recent`
    - `aios://capabilities/enabled`
- Hosted server must not take ownership of workspace/run/artifact semantics away from the product model.
- `GET /api/mcp/hosted-server` must always return arrays for `tools` and `resources`, even when empty.
- `commandLine` is the primary display field for UI and docs; `command + args` must remain spawnable directly by a real MCP client.
- Packaged Electron must support `--mcp-hosted-server` without taking the normal single-instance desktop path.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No AI OS storage exists yet | hosted server still starts and returns empty summaries instead of crashing | `space-desktop.test.mjs` |
| Hosted server summary requested | `status`, `transport`, `command`, `args`, `commandLine`, `tools`, and `resources` are present | `space-desktop.test.mjs` |
| External MCP client connects using `command + args` | client can `listTools`, `listResources`, `readResource`, and `callTool` | `space-desktop.test.mjs` |
| Workspace / artifact data exists | hosted server summaries include current workspace name and created artifact title | `space-desktop.test.mjs` |
| Packaged Electron build exists | packaged app can expose hosted summary and be spawned in `--mcp-hosted-server` mode | packaged smoke |

### 5. Good / Base / Bad Cases

#### Good

- External clients can connect to AI OS through a real stdio MCP server.
- Hosted server exposes useful read-only product summaries.
- Packaged app and local dev mode both provide a valid launch command.

#### Base

- MVP stays read-only and local.
- No discovery, no marketplace, no remote publish flow.

#### Bad

- Returning a command preview string that cannot actually be spawned.
- Mixing provider transport config with hosted MCP server launch config.
- Exposing mutable product operations before trust and approval boundaries are ready.

### 6. Tests Required

- `cd product && npm test`
  - assert hosted server summary route
  - assert real MCP client connectivity over stdio
  - assert workspace / artifact or capability data is readable
- `cd product && npm run validate:electron`
  - assert `mcp-hosted-server.mjs` is copied into packaged resources
  - assert Electron main supports `--mcp-hosted-server`
- `cd product && npm run package:mac`
  - assert packaged app still builds
- Packaged smoke:
  - start packaged app normally and request `/api/mcp/hosted-server`
  - use returned `command + args` to connect a real MCP client
  - assert packaged hosted server returns active workspace and recent artifact summaries

### 7. Wrong vs Correct

#### Wrong

- Add a Hosted MCP panel that only shows hypothetical text and no real spawnable command.
- Build a hosted server that only works in source mode but breaks after Electron packaging.

#### Correct

- Expose a real stdio hosted server with a spawnable command in both source and packaged modes.
- Keep the export set bounded, read-only, and product-owned.
