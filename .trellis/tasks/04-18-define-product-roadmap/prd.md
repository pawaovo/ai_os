# Define AI OS Product Roadmap

## Goal

Create the implementation roadmap for AI OS from the current V0.1 Product Preview to V1.0.

The roadmap must clarify:

- What V0.1 currently is.
- What each later version should deliver.
- What the user can experience after each version.
- Which engineering tasks belong to each version.
- Which tasks can run in parallel.
- Which technology choices should be used for model providers, coding executors, and runtime/agent layers.

## Requirements

- Add a product-level roadmap document under `ai_os/ai_os_docs/`.
- Include version stages from V0.1 through V1.0.
- Include explicit non-goals by stage.
- Include acceptance criteria by stage.
- Include a technology decision section for OpenAI SDK, Claude SDK, pi SDK, custom HTTP adapters, Codex, Claude Code, and our own protocol layers.
- Keep recommendations practical and avoid over-design.

## Acceptance Criteria

- [x] Roadmap document exists.
- [x] V0.1 current state is captured.
- [x] V0.2 through V1.0 stages are defined.
- [x] Technology choices are clearly recommended.
- [x] Parallelization and sequencing rules are included.
- [x] No product code is changed.
- [x] Documentation can guide the next Trellis tasks.

## Non-Goals

- No product implementation changes.
- No SDK installation.
- No database migration.
- No UI changes.
- No full architecture rewrite.
