# P0 Vertical Integration And Regression Baseline

## Goal

Close the P0 loop by validating provider, executor, query-loop, and memory-retrieval work as one stable vertical path.

## Requirements

- Define the representative P0 end-to-end path:
  - configure provider
  - start thread/turn
  - run executor
  - receive normalized events
  - retrieve or skip memory
  - pass through approval/retry logic
  - produce result or artifact
- Define regression scenarios for common failure paths.
- Keep this task focused on integration and regression baseline, not broad new feature scope.

## Scope Boundary

- In scope:
  - vertical integration path
  - regression baseline
  - representative happy-path and failure-path validation
- Out of scope:
  - new platform breadth
  - remote bridge
  - team or multi-agent productization

## Dependencies

- `P0 Provider Governance Foundation`
- `P0 Executor App Server Event Foundation`
- `P0 Single Agent Query Loop Discipline`
- `P0 Memory Retrieval Integration`

## Acceptance Criteria

- [ ] One representative P0 path is defined end to end.
- [ ] Failure scenarios are defined for regression coverage.
- [ ] The baseline explains what must pass before P0 can be considered stable enough to move on.

## Suggested Validation

- Representative end-to-end integration test
- Failure-path regression checks
- Manual walkthrough of the event and trace surfaces

## Suggested Commit Boundary

- Final P0 integration and stabilization commit
