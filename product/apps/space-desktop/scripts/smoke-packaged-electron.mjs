#!/usr/bin/env node
import { mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const productRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

await main();

async function main() {
  const appExecutablePath = resolvePackagedExecutablePath();
  const port = Number.parseInt(process.env.AI_SPACE_APP_PORT ?? "55445", 10);
  const keepRunning = process.argv.includes("--keep-running");
  const storageDir = process.env.AI_SPACE_STORAGE_DIR ?? await mkdtemp(`${tmpdir()}/ai-os-packaged-smoke-`);

  let createdTempStorage = !process.env.AI_SPACE_STORAGE_DIR;
  let child;

  try {
    child = spawn(appExecutablePath, [], {
      cwd: productRoot,
      env: {
        ...process.env,
        AI_SPACE_APP_PORT: String(port),
        AI_SPACE_STORAGE_DIR: storageDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    const readiness = await waitForReadiness(port);
    process.stdout.write(`${JSON.stringify({
      appExecutablePath,
      port,
      storageDir,
      mode: readiness.install?.mode,
      language: readiness.language,
    }, null, 2)}\n`);

    if (keepRunning) {
      process.stdout.write("Packaged smoke left the app running because --keep-running was passed.\n");
      createdTempStorage = false;
      return;
    }

    await stopChild(child);
  } catch (error) {
    if (child) await stopChild(child).catch(() => undefined);
    throw error instanceof Error
      ? new Error(`Packaged Electron smoke failed: ${error.message}`)
      : error;
  } finally {
    if (createdTempStorage) {
      await rm(storageDir, { recursive: true, force: true });
    }
  }
}

function resolvePackagedExecutablePath() {
  if (process.platform !== "darwin") {
    throw new Error("smoke-packaged-electron.mjs currently supports macOS packaged validation only.");
  }

  const appDir = process.arch === "arm64"
    ? resolve(productRoot, "build/electron/mac-arm64/AI OS.app")
    : resolve(productRoot, "build/electron/mac/AI OS.app");

  return resolve(appDir, "Contents/MacOS/AI OS");
}

async function waitForReadiness(port) {
  let lastError;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/app/readiness`);
      if (response.ok) {
        return await response.json();
      }
      lastError = new Error(`Readiness returned ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }

  throw lastError ?? new Error("Timed out waiting for packaged readiness.");
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("close", resolve));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
