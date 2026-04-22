# P1 MCP Client Config Sync

## Goal

Add a thin local MCP client config layer that supports global defaults, workspace overrides, resolved config projection, and minimal local health checks.

## Requirements

- Store a global default MCP client config.
- Store a workspace-scoped MCP override config.
- Resolve the effective MCP config for the active workspace.
- Surface the resolved config and local health in the UI.
- Keep the first step additive and local-first.

## Scope Boundary

- In scope:
  - config contract
  - persistence
  - resolved config projection
  - local health check
  - settings UI
- Out of scope:
  - real MCP transport sessions
  - external client file writes
  - MCP marketplace
  - MCP server hosting

## Dependencies

- Should follow `P1 Workspace Runtime Contract`.
- Should remain separate from provider transport.

## Acceptance Criteria

- [ ] AI OS stores global and workspace MCP config.
- [ ] Active workspace resolves effective MCP config from the correct source.
- [ ] UI shows scope, resolved source, and local health.
- [ ] Tests cover resolution and scoping.

## Suggested Validation

- Verify workspace switching changes resolved config source correctly.
- Verify missing commands degrade to a clear local health state.

## Suggested Commit Boundary

- Config persistence first
- Resolution second
- UI and tests third
