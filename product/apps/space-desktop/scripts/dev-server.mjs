#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, join, normalize, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const productRoot = resolve(appRoot, "../..");
const publicRoot = join(appRoot, "public");
const port = Number.parseInt(process.env.PORT ?? "5173", 10);
const executorTimeoutMs = Number.parseInt(process.env.AI_SPACE_EXECUTOR_TIMEOUT_MS ?? "60000", 10);

if (process.env.AI_SPACE_SKIP_BUILD !== "1") {
  buildProduct();
}

const { parseSpaceDemoRunRequest, runSpaceDemoRequest } = await import(
  pathToImportUrl(join(appRoot, "dist/server-runtime.js"))
);
let processRunner;

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url?.startsWith("/api/demo/run")) {
      await handleRunRequest(request, response);
      return;
    }

    const filePath = await resolveRequestPath(request.url ?? "/");
    const content = await readFile(filePath);

    response.writeHead(200, {
      "content-type": contentType(filePath),
      "cache-control": "no-store",
    });
    response.end(content);
  } catch (error) {
    const status = error instanceof NotFoundError ? 404 : 500;
    response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
    response.end(status === 404 ? "Not found" : "Internal server error");
  }
});

server.listen(port, () => {
  process.stdout.write(`AI Space Demo: http://localhost:${port}\n`);
});

function buildProduct() {
  execFileSync(process.execPath, ["./node_modules/typescript/bin/tsc", "-b"], {
    cwd: productRoot,
    stdio: "inherit",
  });
}

async function handleRunRequest(request, response) {
  try {
    const body = await readJsonBody(request);
    const runRequest = parseSpaceDemoRunRequest(body);
    const payload = await runSpaceDemoRequest(runRequest, {
      runner: processRunner,
    });

    writeJson(response, 200, payload);
  } catch (error) {
    writeJson(response, 400, {
      error: error instanceof Error ? error.message : "Invalid demo run request.",
    });
  }
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) {
      throw new Error("Request body is too large.");
    }
  }

  return JSON.parse(body);
}

function writeJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function resolveRequestPath(rawUrl) {
  const url = new URL(rawUrl, "http://localhost");

  if (url.pathname === "/" || url.pathname === "/index.html") {
    return join(publicRoot, "index.html");
  }

  if (url.pathname === "/assets/styles.css") {
    return join(publicRoot, "styles.css");
  }

  if (url.pathname.startsWith("/apps/") || url.pathname.startsWith("/packages/")) {
    const filePath = normalize(join(productRoot, decodeURIComponent(url.pathname)));

    if (!filePath.startsWith(productRoot)) {
      throw new NotFoundError();
    }

    const info = await stat(filePath);
    if (!info.isFile()) {
      throw new NotFoundError();
    }

    return filePath;
  }

  throw new NotFoundError();
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function pathToImportUrl(filePath) {
  return pathToFileURL(filePath).href;
}

class NodeProcessRunner {
  constructor(defaultCwd, timeoutMs) {
    this.defaultCwd = defaultCwd;
    this.timeoutMs = timeoutMs;
  }

  async isAvailable(command) {
    return new Promise((resolve) => {
      const child = spawn(command, ["--version"], {
        cwd: this.defaultCwd,
        stdio: "ignore",
      });

      child.once("error", () => resolve(false));
      child.once("close", (code) => resolve(code === 0));
    });
  }

  async *run(command) {
    const child = spawn(command.command, command.args, {
      cwd: command.cwd ?? this.defaultCwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, this.timeoutMs);
    const spawnError = new Promise((_, reject) => {
      child.once("error", reject);
    });
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    if (command.input) {
      child.stdin.end(command.input);
    } else {
      child.stdin.end();
    }

    const lines = createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });

    for await (const line of lines) {
      yield line;
    }

    const [code] = await Promise.race([once(child, "close"), spawnError]).finally(() => {
      clearTimeout(timeout);
    });
    if (timedOut) {
      throw new Error(`${command.command} exceeded ${this.timeoutMs}ms demo timeout.`);
    }

    if (code !== 0) {
      throw new Error(stderr.trim() || `${command.command} exited with code ${code}`);
    }
  }
}

processRunner = new NodeProcessRunner(productRoot, executorTimeoutMs);

class NotFoundError extends Error {}
