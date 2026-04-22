#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const delayMs = readDelayMs(process.argv.slice(2));

const server = new McpServer({
  name: "fixture-mcp",
  version: "1.0.0",
});

server.registerTool("fixture.echo", {
  title: "Fixture Echo",
  description: "Return a deterministic fixture response.",
}, async () => ({
  content: [
    {
      type: "text",
      text: "fixture echo ok",
    },
  ],
}));

server.registerTool("fixture.status", {
  title: "Fixture Status",
  description: "Return a deterministic fixture status payload.",
}, async () => ({
  content: [
    {
      type: "text",
      text: "fixture status ok",
    },
  ],
}));

if (delayMs > 0) {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

await server.connect(new StdioServerTransport());

function readDelayMs(args) {
  const delayIndex = args.indexOf("--delay-ms");
  if (delayIndex === -1) return 0;
  const value = Number.parseInt(args[delayIndex + 1] ?? "0", 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}
