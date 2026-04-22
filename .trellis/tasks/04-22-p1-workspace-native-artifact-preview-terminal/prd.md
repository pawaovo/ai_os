# P1 Workspace Native Artifact Preview Terminal

## Goal

Make artifact preview and terminal-style workspace context native surfaces of the workspace runtime instead of leaving them as disconnected product pages.

## Requirements

- Expose a workspace-native artifact preview surface from the existing workspace runtime contract.
- Expose a workspace-native terminal summary surface from the current local workspace path and git state.
- Keep the first step additive and local-first:
  - no PTY embedding
  - no live terminal streaming
  - no new workspace runtime store
- Reuse existing artifact data and workspace path/git state where possible.
- Keep the UI scoped to the active workspace and avoid leaking data across workspaces.

## Scope Boundary

- In scope:
  - backend runtime summary extension for artifact preview and terminal summary
  - minimal UI surface for current workspace preview and terminal summary
  - tests for workspace-scoped artifact preview and workspace path/git summary
- Out of scope:
  - interactive terminal
  - command execution from the terminal surface
  - preview editor redesign
  - artifact routing redesign

## Dependencies

- Should build on `P1 Workspace Runtime Contract`.
- Should remain compatible with `P1 Workspace Long Run Continuation`.

## Acceptance Criteria

- [ ] Active workspace runtime includes a latest artifact preview summary.
- [ ] Active workspace runtime includes a terminal-style workspace summary derived from the local path.
- [ ] The product UI renders these two surfaces from the workspace runtime contract.
- [ ] The contract is covered by tests and remains workspace-scoped.

## Suggested Validation

- Review against:
  - current artifact preview behavior
  - current workspace diff and git summary behavior
- Verify no cross-workspace leakage in preview or terminal data.

## Suggested Commit Boundary

- Runtime summary extension first
- UI rendering second
- Workspace-scoped test coverage third
