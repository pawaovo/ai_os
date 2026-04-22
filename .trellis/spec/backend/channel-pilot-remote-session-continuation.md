# Channel Pilot Remote Session Continuation

> Boundary document for the first safe channel pilot and remote continuation rules.

## Scope

- Single channel pilot only
- Remote-to-local workspace binding
- Reuse of existing continuation semantics

## Contracts

- Remote continuation may only reuse continuation paths already declared safe in the local product.
- Remote bridge must not claim executor-native resume where only product-level rerun is supported.

## Current MVP Reference

- Concrete single-channel pilot behavior is implemented in `remote-bridge-pilot-mvp.md`.
