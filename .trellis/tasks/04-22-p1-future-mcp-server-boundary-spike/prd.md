# P1 Future MCP Server Boundary Spike

## Goal

Document the future MCP server boundary so later platform work does not blur local product objects, MCP client config, and transport/server responsibilities.

## Requirements

- Clarify what belongs to:
  - product object model
  - MCP client config layer
  - future MCP server layer
- Document stop rules for the current phase.
- Keep this task documentation-only.

## Scope Boundary

- In scope:
  - future MCP server boundary documentation
  - responsibilities and stop rules
- Out of scope:
  - product code changes
  - MCP server implementation
  - transport runtime

## Dependencies

- Should follow `P1 MCP Client Config Sync`.

## Acceptance Criteria

- [ ] The future MCP server boundary is documented in executable terms.
- [ ] The document states what is explicitly not part of the current product step.
- [ ] Later platform work has a clear starting point.
