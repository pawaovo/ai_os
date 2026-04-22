# P3 MCP Server Hosting MVP

## Goal

Turn AI OS from a local MCP client into a minimal local-first MCP server host that external MCP clients can connect to over stdio.

## Requirements

- Keep the MVP local-first and additive.
- Use the official stable MCP TypeScript SDK server side.
- Expose a real stdio MCP server entrypoint that external clients can spawn.
- Keep the first hosted server scope read-only or low-risk:
  - workspace summary
  - recent artifacts
  - installed capabilities
  - memory summary or other clearly bounded product summaries
- Do not move product object ownership into the MCP server layer.
- Add a minimal product summary surface for hosted server status and connection command.
- Keep Electron packaging aligned so the hosted server helper is present in packaged resources when needed.

## Scope Boundary

- In scope:
  - stdio MCP hosted server script
  - product summary API for hosted server command / exports
  - minimal settings UI surface
  - regression tests using a real MCP client connection
- Out of scope:
  - HTTP / streamable MCP hosting
  - remote-public exposure
  - marketplace / discovery
  - write-capable tool execution
  - team / remote bridge coupling

## Technical Notes

- MVP should prefer a spawnable Node script over a long-lived background daemon.
- Hosted server should read existing local AI OS storage rather than define a second state store.
- MVP should present a command that advanced users or external MCP clients can invoke directly.

## Acceptance Criteria

- [ ] AI OS provides a real stdio MCP hosted server that can be connected to by a test client.
- [ ] Hosted server exposes a bounded set of useful product summaries.
- [ ] Settings UI shows hosted server status and connection guidance.
- [ ] Electron validation and packaging stay correct.
- [ ] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
