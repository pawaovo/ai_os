#!/usr/bin/env node
import { mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const productRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const workspacePath = resolve(productRoot, "..");
const port = Number.parseInt(process.env.AI_SPACE_APP_PORT ?? "55446", 10);
const storageDir = process.env.AI_SPACE_STORAGE_DIR ?? await mkdtemp(`${tmpdir()}/ai-os-real-codex-smoke-`);
const timeoutMs = Number.parseInt(process.env.AI_SPACE_EXECUTOR_TIMEOUT_MS ?? "180000", 10);
let createdTempStorage = !process.env.AI_SPACE_STORAGE_DIR;
let child;

await main();

async function main() {
  try {
    child = spawn(process.execPath, ["./apps/space-desktop/scripts/dev-server.mjs"], {
      cwd: productRoot,
      env: {
        ...process.env,
        PORT: String(port),
        AI_SPACE_SKIP_BUILD: "1",
        AI_SPACE_STORAGE_DIR: storageDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    await waitForHttp(`${baseUrl()}/`);

    const readiness = await apiJson("GET", "/api/app/readiness");
    const workspace = await apiJson("POST", "/api/workspaces", {
      name: "Real Codex Success Smoke",
      path: workspacePath,
      trustLevel: "strict",
    });
    await apiJson("PATCH", "/api/settings/workspace-selection", {
      workspaceId: workspace.workspace.id,
    });

    const started = await apiJson("POST", "/api/runs/start", {
      goal: "Review the current workspace and return exactly three concise bullet points about the repository. Do not modify files.",
      executorChoice: "codex",
      timeoutMs,
    });
    const runId = started.run.id;

    let live = await apiJson("GET", `/api/runs/${encodeURIComponent(runId)}/live`);
    if (live.live.status === "awaiting-approval") {
      await apiJson("POST", `/api/runs/${encodeURIComponent(runId)}/approval`, {
        decision: "grant",
      });
    }

    live = await waitForTerminalRun(runId, "completed");
    const events = await apiJson("GET", `/api/runs/${encodeURIComponent(runId)}/events`);
    const artifacts = await apiJson("GET", "/api/artifacts");
    const recipe = await apiJson("POST", "/api/recipes/from-run", {
      runId,
    });

    const runArtifacts = artifacts.artifacts.filter((artifact) => artifact.runId === runId);
    const transcript = runArtifacts.find((artifact) => artifact.title === "Executor Transcript");

    if (!transcript) {
      throw new Error("Real Codex smoke did not produce Executor Transcript fallback artifact.");
    }

    process.stdout.write(`${JSON.stringify({
      readinessLanguage: readiness.language,
      runId,
      finalStatus: live.live.status,
      artifactTitles: runArtifacts.map((artifact) => artifact.title),
      eventTypes: events.events.map((event) => event.type),
      recipeId: recipe.recipe.id,
      recipeSourceRunId: recipe.recipe.sourceRunId,
    }, null, 2)}\n`);
  } finally {
    if (child) await stopChild(child).catch(() => undefined);
    if (createdTempStorage) {
      await rm(storageDir, { recursive: true, force: true });
    }
  }
}

function baseUrl() {
  return `http://127.0.0.1:${port}`;
}

async function apiJson(method, path, body) {
  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-ai-os-language": "zh-CN",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${payload.error ?? text}`);
  }
  return payload;
}

async function waitForHttp(url) {
  let lastError;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function waitForTerminalRun(runId, expectedStatus) {
  let latest;
  for (let attempt = 0; attempt < 720; attempt += 1) {
    latest = await apiJson("GET", `/api/runs/${encodeURIComponent(runId)}/live`);
    const status = latest.live?.status;
    if (status === expectedStatus) return latest;
    if (status === "failed" || status === "interrupted") {
      throw new Error(`Real Codex smoke run ended as ${status}: ${latest.live?.latestMessage ?? "unknown failure"}`);
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for run ${runId} to reach ${expectedStatus}.`);
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("close", resolve));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
