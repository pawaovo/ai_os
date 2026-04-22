# P1 Workspace Runtime Contract

## Goal

Upgrade AI OS workspace from a simple selected directory into a durable runtime container with a stable object and state contract.

## Requirements

- Define a stable workspace runtime summary that can describe:
  - active state
  - scoped object counts
  - latest runtime activity
  - current run and thread pointers where relevant
  - workspace-native runtime surfaces that later P1 tasks can build on
- Keep the contract additive and backward-compatible with the current product shell.
- Make the workspace runtime visible in both backend responses and product UI so later tasks do not invent a second workspace state model.
- Keep the first step local-first and derived from existing persisted objects rather than introducing a new distributed runtime layer.

## Scope Boundary

- In scope:
  - workspace runtime summary contract
  - backend serialization for workspace runtime state
  - minimal UI surface for current workspace runtime state
  - test coverage for workspace runtime contract stability
- Out of scope:
  - resumable long-running mission recovery
  - terminal embedding
  - artifact preview redesign
  - Prompt App runtime binding
  - MCP transport changes

## Dependencies

- Should build on the completed P0 executor session, query-loop, and memory contracts.
- Should become the base contract for:
  - `P1 Workspace Long Run Continuation`
  - `P1 Workspace Native Artifact Preview Terminal`
  - `P1 Prompt App Contract`

## Acceptance Criteria

- [ ] AI OS exposes a stable workspace runtime summary contract.
- [ ] The contract describes workspace-scoped threads, runs, artifacts, memory, automation, and current activity without requiring a second runtime store.
- [ ] The product UI can show the current workspace runtime state from the new contract.
- [ ] The contract is covered by tests so later P1 work can extend it without silent drift.

## Suggested Validation

- Review against:
  - `Alma` workspace runtime feel
  - `CodePilot` object/runtime separation
- Verify the contract remains aligned with current AI OS objects:
  - workspace
  - thread
  - run
  - artifact
  - automation
  - memory

## Suggested Commit Boundary

- Workspace runtime contract first
- UI and surface projection second
- Follow-on continuation or preview work later
