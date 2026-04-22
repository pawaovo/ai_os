# Backend Development Guidelines

> Best practices for backend development in this project.

---

## Overview

This directory contains guidelines for backend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | To fill |
| [Database Guidelines](./database-guidelines.md) | ORM patterns, queries, migrations | To fill |
| [Agent Hub Skeleton](./agent-hub-skeleton.md) | Read-only runtime registry layer that aggregates executors, Prompt App installs, and MCP projection | Active |
| [Agent Hub Orchestration MVP](./agent-hub-orchestration-mvp.md) | Local-first orchestration layer that sequences planner, worker, and reviewer child runs through existing run sessions | Active |
| [Channel Pilot Remote Session Continuation](./channel-pilot-remote-session-continuation.md) | Boundary contract for a single remote channel pilot that reuses local continuation semantics | Active |
| [Electron Desktop Shell](./electron-desktop-shell.md) | Runtime, packaging, env, and secret-store contracts for the Electron product shell | Active |
| [External Runtime Compatibility Contract](./external-runtime-compatibility-contract.md) | Additive external runtime compatibility metadata before Agent Hub work | Active |
| [Future MCP Server Boundary Spike](./future-mcp-server-boundary-spike.md) | Documentation boundary for future MCP server layer beyond current product-owned runtime | Active |
| [Local Setup Import And Reset](./local-setup-import-and-reset.md) | Backend discovery/import/reset contract for first-use onboarding and safe local data cleanup | Active |
| [Remote Bridge Pilot MVP](./remote-bridge-pilot-mvp.md) | Single-channel authenticated remote bridge session layer that reuses existing local run and approval semantics | Active |
| [Mailbox Runtime MVP](./mailbox-runtime-mvp.md) | Local mailbox persistence for orchestration and remote bridge handoff messages | Active |
| [MCP Client Config Sync](./mcp-client-config-sync.md) | Local MCP default/override config projection and health contract | Active |
| [MCP Server Hosting MVP](./mcp-server-hosting-mvp.md) | Local stdio MCP hosted server that exposes bounded AI OS summaries to external clients | Active |
| [MCP Transport Runtime](./mcp-transport-runtime.md) | Real stdio MCP runtime probe layered on top of the existing config projection | Active |
| [Multi Agent Coordination Mailbox](./multi-agent-coordination-mailbox.md) | Boundary contract for minimal mailbox and coordinator-worker linkage | Active |
| [Multi Agent Governance Summary](./multi-agent-governance-summary.md) | Backend summary contract for future multi-agent governance surface | Active |
| [Prompt App Contract](./prompt-app-contract.md) | Shared Prompt App Draft contract layered on top of the existing recipe flow | Active |
| [Recipe Prompt App Bridge](./recipe-prompt-app-bridge.md) | Installation and rerun bridge from Prompt App Draft into local capability execution | Active |
| [Remote Bridge Identity Trust Audit](./remote-bridge-identity-trust-audit.md) | Boundary contract for remote identity, trust, approval, and audit semantics | Active |
| [Workspace Long Run Continuation](./workspace-long-run-continuation.md) | Persisted run runtime checkpoints and safe first-step continuation rules | Active |
| [Workspace Native Artifact Preview Terminal](./workspace-native-artifact-preview-terminal.md) | Workspace-scoped latest artifact preview and read-only terminal summary surface | Active |
| [Workspace Runtime Contract](./workspace-runtime-contract.md) | Product-layer workspace runtime summary contract for scoped state and live run projection | Active |
| [Error Handling](./error-handling.md) | Error types, handling strategies | To fill |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To fill |
| [Logging Guidelines](./logging-guidelines.md) | Structured logging, log levels | To fill |

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.
