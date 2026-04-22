# P0 Provider Governance Foundation

## Goal

Strengthen AI OS provider handling from a thin protocol adapter into a governed provider layer with better configuration, diagnosis, and model handling.

## Requirements

- Introduce an executable plan for:
  - provider registry
  - provider catalog
  - protocol detection
  - connection doctor
  - model loading and alias handling
  - structured provider error mapping
- Keep AI OS core provider interfaces protocol-first and vendor-neutral.
- Preserve support for custom base URLs and custom API keys.
- Do not hardwire AI OS core to any single vendor SDK.

## Scope Boundary

- In scope:
  - provider governance design
  - provider catalog design
  - provider diagnosis path
  - provider error taxonomy
  - compatibility with current OpenAI-compatible and Anthropic-compatible adapters
- Out of scope:
  - broad vendor expansion all at once
  - remote bridge integration
  - team or multi-agent behavior

## Dependencies

- May proceed in parallel with `P0 Single Agent Query Loop Discipline`.
- Must remain compatible with `P0 Executor App Server Event Foundation`.

## Acceptance Criteria

- [ ] AI OS has a documented provider-governance target architecture.
- [ ] The plan defines a registry/catalog split and provider doctor responsibilities.
- [ ] The plan defines how model loading, aliases, and provider-specific error classes should surface to the product.
- [ ] The plan keeps custom relay and custom base URL support as first-class requirements.

## Suggested Validation

- Review against:
  - `CodePilot` provider catalog / resolver / doctor patterns
  - `AionUi` protocol detection patterns
- Verify that the proposed layer does not leak vendor-native types into AI OS core docs or protocols.

## Suggested Commit Boundary

- Design and scaffolding first
- Implementation second
- Validation and product-surface integration third
