# P3 MCP Transport Runtime

## Goal

Turn the current MCP config-only projection into a real local MCP stdio runtime probe that can connect to a configured MCP server, negotiate a session, and project live runtime metadata back into AI OS.

## Requirements

- Keep the existing MCP config model:
  - global default
  - workspace override
  - resolved effective config
- Add a real stdio MCP runtime probe on top of the resolved config.
- Project runtime facts that are useful to users and later platform layers:
  - connection status
  - server identity / protocol metadata when available
  - discovered tools count
  - probe timestamp
  - failure detail
- Keep the first transport step read-only:
  - no tool execution
  - no product object ownership changes
  - no MCP server hosting
  - no agent orchestration
- Surface the runtime state in the existing Settings / Agent Runtime surfaces.
- Keep the implementation local-first and process-bounded:
  - short timeout
  - explicit cleanup
  - no long-lived background session manager yet

## Scope Boundary

- In scope:
  - real MCP stdio connect / initialize / list-tools probe
  - backend API payload extension for MCP runtime state
  - minimal renderer updates for runtime detail
  - regression coverage with a local mock MCP stdio server
- Out of scope:
  - MCP server hosting
  - MCP transport persistence / reconnection manager
  - tool invocation from AI OS product flows
  - remote bridge / channel pilot
  - mailbox / multi-agent orchestration

## Dependencies

- Builds on:
  - `P1 MCP Client Config Sync`
  - `P2 Agent Hub Skeleton`
  - `P2 External Runtime Compatibility Contract`

## Acceptance Criteria

- [ ] AI OS can probe a configured MCP stdio server and reflect real runtime status.
- [ ] MCP config summary includes additive runtime metadata without breaking existing config projection.
- [ ] Agent Runtime Registry shows richer MCP runtime detail derived from the real probe.
- [ ] Tests cover success, timeout/failure, and workspace override behavior.
- [ ] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
