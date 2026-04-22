# Future MCP Server Boundary Spike

> Executable boundary document for future MCP server work after the current product-facing MCP client config step.

## Scenario: Future MCP Server Layer

### 1. Scope / Trigger

- Trigger: planning future MCP server hosting, bridging, or transport work.
- Trigger: considering whether a capability, prompt app, or workspace runtime concern should move into an MCP server layer.

### 2. Current Phase Boundary

The current product step includes:

- product object model
- workspace runtime
- Prompt App Draft contract
- local MCP client config projection

The current product step does **not** include:

- MCP server hosting
- transport session lifecycle
- marketplace/server discovery
- remote bridge/session relay

### 3. Responsibilities

#### Product Object Model Owns

- workspace
- thread
- run
- artifact
- approval
- memory
- automation
- Prompt App Draft

#### MCP Client Config Layer Owns

- global default config
- workspace override config
- resolved effective config
- local health projection

#### Future MCP Server Layer Should Own

- server capability advertisement
- server lifecycle and isolation
- transport/session negotiation
- server-side tool exposure boundary

### 4. Contracts

- MCP server work must not redefine the product object model.
- MCP server work must not replace workspace runtime state.
- Prompt App Draft and capability execution semantics must stay product-defined even if future MCP transport is introduced.
- Future MCP server integration should consume the existing MCP client config contract rather than replacing it.

### 5. Stop Rules

- Do not implement MCP server hosting before MCP client config is stable.
- Do not put workspace, run, or artifact ownership into an MCP server layer.
- Do not mix provider transport and MCP server transport into one config contract.
- Do not treat MCP server work as a prerequisite for current local Prompt App or workspace runtime flows.

### 6. Good / Base / Bad Cases

#### Good

- Future MCP server work starts from a clearly documented platform seam.
- Product objects remain local-first and product-owned.

#### Base

- Current product keeps MCP in config-only mode.

#### Bad

- Turning MCP server into a second runtime model for workspace/run state.
- Moving product object semantics into transport/server configuration.

### 7. Validation

This spike is documentation-only. No product test changes are required for the first boundary note.
