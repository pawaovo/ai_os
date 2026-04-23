# P9.2 First Success Journey

## Goal

Reduce friction on the first successful product path by tightening the provider-import, default-name, and retry experience without adding new product surfaces.

## Requirements

- Keep the work additive and product-surface preserving.
- Improve first-use defaults that are system-owned.
- Make import-from-Codex lead into a more usable provider state.
- Preserve user-entered chat input when a first chat attempt fails.

## Acceptance Criteria

- [x] Importing a provider from local Codex config refreshes provider state and eagerly attempts model loading.
- [x] Server-owned default names such as auto-created thread and remote bridge principal follow the saved UI language.
- [x] Chat composer restores the user's message after a failed send so retry is immediate.
- [x] Tests cover server-owned first-use defaults and static browser flow expectations.
