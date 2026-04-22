# P1 Prompt App Contract

## Goal

Formalize the current Forge recipe draft into a stable Prompt App Draft contract without introducing a second product runtime.

## Requirements

- Keep the current `Run -> Recipe -> Prompt App Draft -> Capability` product path.
- Define a shared Prompt App Draft contract that extends the current recipe object with a thin runtime binding layer.
- Keep the first step additive and backward-compatible with the current recipe APIs and UI.
- Surface the Prompt App Draft binding in the current Forge editor so users can see how the draft binds to workspace/runtime policy.

## Scope Boundary

- In scope:
  - shared Prompt App Draft contract
  - minimal runtime binding fields
  - recipe persistence updates for the new binding
  - Forge editor display of Prompt App Draft binding
- Out of scope:
  - standalone Prompt App runtime
  - new Prompt App page
  - Prompt App marketplace
  - MCP/tool transport changes

## Dependencies

- Should follow `P1 Workspace Runtime Contract`.
- Should remain compatible with the current Forge recipe flow.

## Acceptance Criteria

- [ ] AI OS exposes a shared Prompt App Draft contract.
- [ ] Current recipe records include a thin runtime binding contract.
- [ ] Forge UI shows the Prompt App Draft binding without requiring a new product page.
- [ ] Existing recipe creation, test, export, and rerun flows still pass.

## Suggested Validation

- Review against:
  - current V0.9 Forge recipe flow
  - current workspace runtime contract
- Verify the contract remains additive and local-first.

## Suggested Commit Boundary

- Shared contract first
- Persistence second
- Forge UI projection third
