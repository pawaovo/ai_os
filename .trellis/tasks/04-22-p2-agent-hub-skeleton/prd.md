# P2 Agent Hub Skeleton

## Goal

Introduce a minimal Agent Hub projection that aggregates external runtimes without replacing the current product runtime model.

## Requirements

- Keep the first step additive and registry-focused.
- Expose a unified agent runtime list derived from:
  - external executors
  - installed Prompt App drafts
  - resolved MCP client config
- Keep the first step read-only.
- Make the projection visible in the product UI.

## Scope Boundary

- In scope:
  - aggregated runtime registry API
  - minimal settings UI surface
  - workspace-aware Prompt App and MCP projection
- Out of scope:
  - orchestration
  - mailbox
  - remote bridge transport
  - multi-agent execution

## Dependencies

- Should build on `P2 External Runtime Compatibility Contract`.

## Acceptance Criteria

- [ ] AI OS exposes an additive agent runtime registry.
- [ ] Registry aggregates executors, Prompt App installs, and MCP resolved config.
- [ ] Settings UI can render the registry without new product navigation.
- [ ] Tests cover workspace-aware projection.
