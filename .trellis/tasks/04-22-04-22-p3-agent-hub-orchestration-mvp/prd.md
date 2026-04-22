# P3 Agent Hub Orchestration MVP

## Goal

Turn the current read-only Agent Hub runtime registry into a minimal local orchestration flow that can plan a small multi-agent task, launch child runs through existing executors, and show progress plus results in the product UI.

## Requirements

- Keep the MVP local-first and additive.
- Reuse existing runtime surfaces:
  - executor runtime status
  - run persistence and live run projection
  - workspace / artifact / memory summaries
  - agent runtime registry
- Introduce a minimal orchestration object model:
  - orchestration summary
  - agent task summary
  - child run linkage
  - aggregate status and result
- Support a simple local plan with clear roles:
  - planner
  - worker
  - reviewer
- Allow the product to start an orchestration from a user goal.
- Automatically advance through dependent steps without requiring manual polling by the user.
- Surface orchestration state in a minimal product UI.

## Scope Boundary

- In scope:
  - local orchestration object model
  - child run sequencing through existing `createRunSession`
  - aggregate orchestration API
  - minimal Agents product surface
  - regression tests for orchestration success and failure
- Out of scope:
  - remote bridge
  - team workflow
  - persistent mailbox runtime
  - arbitrary DAG planning
  - marketplace / cloud orchestration

## Technical Notes

- MVP may keep a fixed three-step plan instead of dynamic free-form planning.
- MVP should favor deterministic and testable orchestration over broad autonomy.
- Child runs should remain ordinary product runs; orchestration must not introduce a second run model.
- Agent tasks may be sequential where dependencies require it, but the orchestration model should remain ready for later parallel expansion.

## Acceptance Criteria

- [ ] AI OS can start a local agent orchestration from a goal.
- [ ] Orchestration creates multiple agent tasks and links them to child runs.
- [ ] Product UI shows orchestration status, task list, and linked run progress.
- [ ] Tests cover successful completion, failed child run propagation, and persistence-safe aggregate projection.
- [ ] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
