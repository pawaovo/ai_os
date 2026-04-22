# P2 External Runtime Compatibility Contract

## Goal

Make external runtime compatibility explicit before broader Agent Hub or remote runtime work begins.

## Requirements

- Extend the current external runtime contract to expose compatibility and capability gaps.
- Keep the first step additive to the current executor protocol.
- Let product APIs and UI consume compatibility summaries instead of guessing support from runtime names.
- Keep transport and runtime identity explicit.

## Scope Boundary

- In scope:
  - compatibility contract
  - executor runtime compatibility projection
  - product API compatibility exposure
  - minimal UI/test coverage
- Out of scope:
  - Agent Hub orchestration
  - remote bridge transport
  - new external runtime implementation

## Dependencies

- Should be completed before `P2 Agent Hub Skeleton`.

## Acceptance Criteria

- [ ] Executor runtime status exposes compatibility metadata.
- [ ] Codex and Claude adapters declare real current support levels.
- [ ] Product executor API/UI can surface the compatibility contract.
- [ ] Tests cover compatibility shape and key capability gaps.
