# P0 Executor App Server Event Foundation

## Goal

Evolve AI OS executor handling toward a durable protocol and event model that can later support richer executor sessions and app-server-style integration.

## Requirements

- Define how current AI OS `run/event` concepts should evolve toward:
  - richer session lifecycle
  - clearer event taxonomy
  - potential `thread / turn / item / event` style separation where useful
- Preserve the current AI OS executor boundary:
  - executor adapters remain below product objects
- Keep Codex and Claude Code integrations adapter-based.

## Scope Boundary

- In scope:
  - executor protocol evolution
  - event model refinement
  - session lifecycle model
  - app-server-style boundary planning
- Out of scope:
  - remote bridge
  - ACP hub
  - full multi-agent orchestration

## Dependencies

- Must stay aligned with `P0 Single Agent Query Loop Discipline`.
- Provider-governance work may proceed in parallel.

## Acceptance Criteria

- [ ] AI OS has a documented next-step executor protocol plan.
- [ ] The plan defines clearer event classes and executor session boundaries.
- [ ] The plan explicitly separates UI-facing events from executor-native events.
- [ ] The plan names the Codex app-server and Claude Code runtime patterns that should influence AI OS, without copying them wholesale.

## Suggested Validation

- Review against:
  - `Codex` app-server and event model
  - `Claude Code` task/runtime semantics
- Verify that the proposed model still fits current AI OS objects:
  - workspace
  - thread
  - run
  - artifact
  - approval

## Suggested Commit Boundary

- Protocol design first
- Adapter alignment second
- UI and persistence alignment third
