# P0 Single Agent Query Loop Discipline

## Goal

Define a stronger single-agent runtime loop for AI OS so turns, tool use, retries, permissions, and state transitions are explicit and durable.

## Requirements

- Clarify:
  - turn lifecycle
  - tool orchestration boundaries
  - permission interception points
  - error recovery and retry sites
  - long-lived session state
- Keep the AI OS `Companion -> Control Plane -> Executor/Tools` structure explicit.
- Do not let request handlers become the hidden runtime model.

## Scope Boundary

- In scope:
  - single-agent runtime design
  - tool-loop structure
  - permission flow structure
  - session-state model
- Out of scope:
  - full multi-agent productization
  - team mailbox systems
  - remote bridge

## Dependencies

- May proceed in parallel with `P0 Provider Governance Foundation`.
- Must align with `P0 Executor App Server Event Foundation`.
- `P0 Memory Retrieval Integration` should follow its runtime boundary decisions.

## Acceptance Criteria

- [ ] AI OS has a documented single-agent runtime loop target.
- [ ] The plan identifies where permissions, retries, and tool execution are intercepted.
- [ ] The plan explains how long-lived session state differs from simple request handling.
- [ ] The plan maps Claude Code and Proma patterns into AI OS concepts rather than copying vendor-specific structures.

## Suggested Validation

- Review against:
  - `Claude Code` QueryEngine / Tool runtime
  - `Proma` orchestrator
  - `CodePilot` runtime split
- Verify that the resulting structure still supports our local-first product surfaces cleanly.

## Suggested Commit Boundary

- Runtime-loop design first
- Event and permission boundaries second
- Implementation and persistence updates third
