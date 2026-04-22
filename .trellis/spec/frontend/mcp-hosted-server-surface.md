# MCP Hosted Server Surface

> Executable contract for the first read-only Hosted MCP Server panel in Settings.

## Scenario: Hosted MCP Server Panel

### 1. Scope / Trigger

- Trigger: changing Hosted MCP Server DOM in `product/apps/space-desktop/public/index.html`.
- Trigger: changing `product/apps/space-desktop/src/browser.ts` hosted MCP load/render logic.
- Trigger: changing `product/apps/space-desktop/src/i18n.ts` Hosted MCP copy.
- Trigger: changing static page assertions in `product/tests/space-desktop.test.mjs`.

### 2. Signatures

#### Required DOM ids

- `mcp-hosted-server-title`
- `mcp-hosted-server-status`
- `mcp-hosted-server-transport`
- `mcp-hosted-server-command`
- `mcp-hosted-server-command-line`
- `mcp-hosted-server-tools`
- `mcp-hosted-server-resources`
- `mcp-hosted-server-help`

#### Frontend API Call

```ts
GET /api/mcp/hosted-server
```

Expected payload:

```ts
{
  hostedServer: {
    status: string;
    transport: string;
    detail: string;
    command: string;
    args: string[];
    commandLine: string;
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
  };
}
```

### 3. Contracts

- Panel lives inside Settings and remains read-only in MVP.
- Frontend must always render `commandLine` when available.
- `command` is shown separately for scanability; `args` are only used as a fallback to reconstruct a display string when `commandLine` is missing.
- `tools` and `resources` must render from backend arrays as-is.
- UI must not try to start or stop the hosted server from inside the product in this MVP.
- Copy must exist in both English and Chinese.
- Settings summary list must include a `Hosted MCP Server` item.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| Hosted summary loads successfully | panel shows status, transport, command, command line, tools, and resources | `space-desktop.test.mjs` + manual smoke |
| Hosted summary fails to load | help text shows load error while panel falls back safely | browser runtime behavior |
| No exported tools/resources | UI still renders empty-state items rather than blank lists | browser runtime behavior |

### 5. Good / Base / Bad Cases

#### Good

- User can copy or inspect the spawn command for external clients.
- User can immediately see what the hosted server exports.

#### Base

- Surface is intentionally read-only and compact.

#### Bad

- Hiding the actual launch command behind generic prose.
- Requiring the user to infer tools/resources from docs instead of the live panel.

### 6. Tests Required

- `cd product && npm test`
  - assert Hosted MCP Server DOM ids
  - assert browser source consumes `/api/mcp/hosted-server`
- Packaged smoke:
  - assert `/` includes Hosted MCP Server panel ids

### 7. Wrong vs Correct

#### Wrong

- Put Hosted MCP Server details only into README text or Settings summary bullets.

#### Correct

- Provide a dedicated Settings panel with stable DOM anchors and live data from `/api/mcp/hosted-server`.
