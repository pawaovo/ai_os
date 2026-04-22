# Multi Agent Coordination Mailbox

> Boundary document for minimal coordination and mailbox contracts.

## Scope

- coordinator / worker linkage
- mailbox item lifecycle
- workspace and audit binding

## Contracts

- Mailbox is a coordination contract, not a second runtime store.
- Parent-child relationships must stay traceable to workspace, thread, or run context.

## Current MVP Reference

- Concrete mailbox runtime behavior is implemented in `mailbox-runtime-mvp.md`.
