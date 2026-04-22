# P0 Memory Retrieval Integration

## Goal

Upgrade AI OS memory from simple stored records into a retrieval-oriented system that can inject the right context into chat and runs.

## Requirements

- Define memory operations such as:
  - recent
  - search
  - get
- Define scoring and selection rules:
  - relevance
  - scope
  - recency
  - sensitivity
- Keep memory-use visible in product flows.
- Avoid turning memory into a blind prompt dump.

## Scope Boundary

- In scope:
  - retrieval design
  - scoring model
  - memory-use tracing
  - integration points with chat and runs
- Out of scope:
  - cloud sync
  - team-wide shared memory
  - marketplace distribution

## Dependencies

- Should follow the runtime boundary decisions from `P0 Single Agent Query Loop Discipline`.
- Can research in parallel while provider and executor work proceeds.

## Acceptance Criteria

- [ ] AI OS has a documented retrieval-oriented memory plan.
- [ ] The plan defines recent/search/get style operations.
- [ ] The plan defines how memory-use appears in chat and run traces.
- [ ] The plan explains how local memory records evolve without leaking everything into every prompt.

## Suggested Validation

- Review against:
  - `CodePilot` memory retrieval
  - `Claude Code` memory and long-lived state
- Verify the design still matches current AI OS local-first principles.

## Suggested Commit Boundary

- Retrieval design first
- Scoring and tracing design second
- Product integration third
