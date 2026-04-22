#!/usr/bin/env node
import { existsSync } from "node:fs";
import { accessSync, constants as fsConstants } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const DEFAULT_STORAGE_ROOT = resolve(process.env.AI_SPACE_STORAGE_DIR ?? join(homedir(), ".ai_os", "space-demo"));

export const HOSTED_MCP_SERVER_TOOLS = [
  {
    name: "aios.workspace_summary",
    title: "Workspace Summary",
    description: "Return a concise summary of the active AI OS workspace and its local counts.",
  },
  {
    name: "aios.recent_artifacts",
    title: "Recent Artifacts",
    description: "Return a concise summary of recently saved local artifacts.",
  },
  {
    name: "aios.enabled_capabilities",
    title: "Enabled Capabilities",
    description: "Return a concise summary of currently enabled local capabilities.",
  },
];

export const HOSTED_MCP_SERVER_RESOURCES = [
  {
    uri: "aios://workspace/active",
    title: "Active Workspace",
    description: "Active workspace and runtime summary.",
  },
  {
    uri: "aios://artifacts/recent",
    title: "Recent Artifacts",
    description: "Recent local artifacts summary.",
  },
  {
    uri: "aios://capabilities/enabled",
    title: "Enabled Capabilities",
    description: "Enabled local capabilities summary.",
  },
];

export function parseHostedMcpServerArgs(argv = process.argv.slice(2)) {
  const flag = "--storage-dir";
  const index = argv.indexOf(flag);
  return {
    storageRoot: index >= 0 ? argv[index + 1] : undefined,
  };
}

export function resolveHostedMcpServerStorageRoot(input = {}) {
  return resolve(input.storageRoot ?? process.env.AI_SPACE_STORAGE_DIR ?? DEFAULT_STORAGE_ROOT);
}

export function createHostedMcpServerLaunchSpec(input) {
  const storageRoot = resolveHostedMcpServerStorageRoot({ storageRoot: input.storageRoot });
  const productRoot = resolve(input.productRoot);
  const scriptPath = resolve(productRoot, "apps/space-desktop/scripts/mcp-hosted-server.mjs");
  const electronHostedMode = input.electronHostedMode === true;
  const command = input.command ?? process.execPath;
  const args = electronHostedMode
    ? ["--mcp-hosted-server", "--storage-dir", storageRoot]
    : [scriptPath, "--storage-dir", storageRoot];

  return {
    command,
    args,
    scriptPath,
    storageRoot,
    electronHostedMode,
  };
}

export function createHostedMcpServerSummary(input) {
  const launch = createHostedMcpServerLaunchSpec(input);
  const commandReady = evaluateLocalCommandHealth(launch.command).available;
  const scriptReady = launch.electronHostedMode || evaluateLocalCommandHealth(launch.scriptPath).available;
  const status = commandReady && scriptReady ? "ready" : "failed";
  const detail = status === "ready"
    ? "AI OS can be spawned as a local stdio MCP server by external clients."
    : "Hosted MCP server launch command is not available.";

  return {
    status,
    transport: "stdio",
    detail,
    command: launch.command,
    args: launch.args,
    commandLine: formatCommandLine(launch.command, launch.args),
    storageRoot: launch.storageRoot,
    tools: HOSTED_MCP_SERVER_TOOLS.map((tool) => ({ ...tool })),
    resources: HOSTED_MCP_SERVER_RESOURCES.map((resource) => ({ ...resource })),
  };
}

export async function runHostedMcpServer(input = {}) {
  const storageRoot = resolveHostedMcpServerStorageRoot(input);
  const server = new McpServer({
    name: "ai-os-hosted-server",
    version: "1.0.0",
  });

  server.registerTool("aios.workspace_summary", {
    title: "Workspace Summary",
    description: "Return a concise summary of the active AI OS workspace and its local counts.",
  }, async () => ({
    content: [
      {
        type: "text",
        text: createWorkspaceSummaryText(loadHostedMcpState(storageRoot)),
      },
    ],
  }));

  server.registerTool("aios.recent_artifacts", {
    title: "Recent Artifacts",
    description: "Return a concise summary of recently saved local artifacts.",
  }, async () => ({
    content: [
      {
        type: "text",
        text: createRecentArtifactsText(loadHostedMcpState(storageRoot)),
      },
    ],
  }));

  server.registerTool("aios.enabled_capabilities", {
    title: "Enabled Capabilities",
    description: "Return a concise summary of currently enabled local capabilities.",
  }, async () => ({
    content: [
      {
        type: "text",
        text: createEnabledCapabilitiesText(loadHostedMcpState(storageRoot)),
      },
    ],
  }));

  server.registerResource("aios-active-workspace", "aios://workspace/active", {
    title: "Active Workspace",
    description: "Active workspace and runtime summary.",
    mimeType: "text/plain",
  }, async () => ({
    contents: [
      {
        uri: "aios://workspace/active",
        text: createWorkspaceSummaryText(loadHostedMcpState(storageRoot)),
      },
    ],
  }));

  server.registerResource("aios-recent-artifacts", "aios://artifacts/recent", {
    title: "Recent Artifacts",
    description: "Recent local artifacts summary.",
    mimeType: "text/plain",
  }, async () => ({
    contents: [
      {
        uri: "aios://artifacts/recent",
        text: createRecentArtifactsText(loadHostedMcpState(storageRoot)),
      },
    ],
  }));

  server.registerResource("aios-enabled-capabilities", "aios://capabilities/enabled", {
    title: "Enabled Capabilities",
    description: "Enabled local capabilities summary.",
    mimeType: "text/plain",
  }, async () => ({
    contents: [
      {
        uri: "aios://capabilities/enabled",
        text: createEnabledCapabilitiesText(loadHostedMcpState(storageRoot)),
      },
    ],
  }));

  await server.connect(new StdioServerTransport());
}

function loadHostedMcpState(storageRoot) {
  const dbPath = resolve(storageRoot, "app.db");
  if (!existsSync(dbPath)) {
    return createEmptyHostedState(storageRoot);
  }

  const db = new DatabaseSync(dbPath);
  try {
    const activeWorkspaceId = getSetting(db, "activeWorkspaceId");
    const activeWorkspace = activeWorkspaceId
      ? db.prepare("SELECT * FROM workspaces WHERE id = ?").get(activeWorkspaceId)
      : db.prepare("SELECT * FROM workspaces ORDER BY updated_at DESC LIMIT 1").get();
    const workspaceId = activeWorkspace?.id;

    const counts = {
      workspaces: countRows(db, "workspaces"),
      threads: workspaceId ? countRows(db, "threads", "workspace_id = ?", [workspaceId]) : countRows(db, "threads"),
      runs: workspaceId ? countRows(db, "runs", "workspace_id = ?", [workspaceId]) : countRows(db, "runs"),
      artifacts: workspaceId ? countRows(db, "artifacts", "workspace_id = ?", [workspaceId]) : countRows(db, "artifacts"),
      capabilities: countRows(db, "capabilities"),
      enabledCapabilities: countRows(db, "capabilities", "enabled = 1"),
    };

    const recentArtifacts = workspaceId
      ? db.prepare("SELECT title, kind, updated_at FROM artifacts WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 5").all(workspaceId)
      : db.prepare("SELECT title, kind, updated_at FROM artifacts ORDER BY updated_at DESC LIMIT 5").all();
    const enabledCapabilities = db.prepare(`
      SELECT title, description, kind
      FROM capabilities
      WHERE enabled = 1
      ORDER BY title ASC
      LIMIT 8
    `).all();

    return {
      storageRoot,
      activeWorkspace: activeWorkspace
        ? {
            id: activeWorkspace.id,
            name: activeWorkspace.name,
            path: activeWorkspace.path,
            trustLevel: activeWorkspace.trust_level ?? "strict",
          }
        : undefined,
      counts,
      recentArtifacts,
      enabledCapabilities,
    };
  } finally {
    db.close();
  }
}

function createEmptyHostedState(storageRoot) {
  return {
    storageRoot,
    activeWorkspace: undefined,
    counts: {
      workspaces: 0,
      threads: 0,
      runs: 0,
      artifacts: 0,
      capabilities: 0,
      enabledCapabilities: 0,
    },
    recentArtifacts: [],
    enabledCapabilities: [],
  };
}

function createWorkspaceSummaryText(state) {
  if (!state.activeWorkspace) {
    return [
      "# Active Workspace",
      "",
      "No active AI OS workspace is configured yet.",
      `Storage root: ${state.storageRoot}`,
      "",
      `Saved workspaces: ${state.counts.workspaces}`,
      `Saved runs: ${state.counts.runs}`,
      `Saved artifacts: ${state.counts.artifacts}`,
    ].join("\n");
  }

  return [
    "# Active Workspace",
    "",
    `Name: ${state.activeWorkspace.name}`,
    `Path: ${state.activeWorkspace.path ?? "(no path)"}`,
    `Trust: ${state.activeWorkspace.trustLevel}`,
    "",
    `Threads: ${state.counts.threads}`,
    `Runs: ${state.counts.runs}`,
    `Artifacts: ${state.counts.artifacts}`,
    `Enabled capabilities: ${state.counts.enabledCapabilities}/${state.counts.capabilities}`,
  ].join("\n");
}

function createRecentArtifactsText(state) {
  return [
    "# Recent Artifacts",
    "",
    ...(state.recentArtifacts.length > 0
      ? state.recentArtifacts.map((artifact) => `- ${artifact.title} (${artifact.kind}) / ${artifact.updated_at}`)
      : ["No local artifacts have been saved yet."]),
  ].join("\n");
}

function createEnabledCapabilitiesText(state) {
  return [
    "# Enabled Capabilities",
    "",
    ...(state.enabledCapabilities.length > 0
      ? state.enabledCapabilities.map((capability) => `- ${capability.title} (${capability.kind})`)
      : ["No enabled capabilities are available."]),
  ].join("\n");
}

function getSetting(db, key) {
  return db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key)?.value;
}

function countRows(db, table, whereClause = "", params = []) {
  const query = whereClause
    ? `SELECT COUNT(*) AS total FROM ${table} WHERE ${whereClause}`
    : `SELECT COUNT(*) AS total FROM ${table}`;
  return Number(db.prepare(query).get(...params)?.total ?? 0);
}

function evaluateLocalCommandHealth(command) {
  try {
    accessSync(resolve(command), fsConstants.F_OK);
    return {
      available: true,
    };
  } catch {
    return {
      available: false,
    };
  }
}

function formatCommandLine(command, args) {
  return [command, ...args].map(quoteCommandPart).join(" ");
}

function quoteCommandPart(value) {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const { storageRoot } = parseHostedMcpServerArgs();
  await runHostedMcpServer({ storageRoot }).catch((error) => {
    process.stderr.write(`Hosted MCP server failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
