import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const DEFAULT_TIMEOUT_MS = 4_000;
const DEFAULT_CACHE_TTL_MS = 5_000;
const MAX_STDERR_CHARS = 320;

export function createMcpRuntimeProbeCache(input = {}) {
  const timeoutMs = normalizePositiveInteger(input.timeoutMs, DEFAULT_TIMEOUT_MS);
  const cacheTtlMs = normalizePositiveInteger(input.cacheTtlMs, DEFAULT_CACHE_TTL_MS);
  const now = typeof input.now === "function" ? input.now : () => new Date().toISOString();
  const cache = new Map();

  return {
    async probe(resolvedConfig) {
      const staticSummary = createStaticRuntimeSummary(resolvedConfig, now());
      if (staticSummary) return staticSummary;

      const cacheKey = JSON.stringify({
        command: resolvedConfig.command,
        args: resolvedConfig.args ?? [],
      });
      const cached = cache.get(cacheKey);
      const timestamp = Date.now();

      if (cached?.value && cached.expiresAt > timestamp) {
        return cached.value;
      }

      if (cached?.promise) {
        return cached.promise;
      }

      const promise = runMcpRuntimeProbe({
        resolvedConfig,
        timeoutMs,
        checkedAt: now(),
        appVersion: input.appVersion ?? "0.0.0",
      })
        .then((value) => {
          cache.set(cacheKey, {
            value,
            expiresAt: Date.now() + cacheTtlMs,
          });
          return value;
        })
        .catch((error) => {
          cache.delete(cacheKey);
          throw error;
        });

      cache.set(cacheKey, { promise });
      return promise;
    },
    clear() {
      cache.clear();
    },
  };
}

function normalizePositiveInteger(value, fallback) {
  const normalized = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}

function createStaticRuntimeSummary(resolvedConfig, checkedAt) {
  if (resolvedConfig.health?.status && resolvedConfig.health.status !== "ready") {
    return {
      transport: "stdio",
      status: resolvedConfig.health.status,
      detail: resolvedConfig.health.detail,
      probedAt: checkedAt,
    };
  }

  if (!resolvedConfig.enabled) {
    return {
      transport: "stdio",
      status: "disabled",
      detail: "MCP client config is disabled.",
      probedAt: checkedAt,
    };
  }

  if (!resolvedConfig.command) {
    return {
      transport: "stdio",
      status: "not-configured",
      detail: "Set an MCP client command to resolve an effective config.",
      probedAt: checkedAt,
    };
  }

  return undefined;
}

async function runMcpRuntimeProbe({ resolvedConfig, timeoutMs, checkedAt, appVersion }) {
  const transport = new StdioClientTransport({
    command: resolvedConfig.command,
    args: resolvedConfig.args,
    stderr: "pipe",
  });
  const client = new Client({
    name: "ai-os-personal",
    version: appVersion,
  });
  let stderrOutput = "";
  const stderrStream = transport.stderr;

  if (stderrStream && typeof stderrStream.on === "function") {
    if (typeof stderrStream.setEncoding === "function") {
      stderrStream.setEncoding("utf8");
    }
    stderrStream.on("data", (chunk) => {
      stderrOutput = `${stderrOutput}${String(chunk)}`.slice(-MAX_STDERR_CHARS);
    });
  }

  try {
    const result = await withTimeout(async () => {
      await client.connect(transport, { timeout: timeoutMs });
      const serverInfo = client.getServerVersion();
      const capabilities = client.getServerCapabilities();
      const supportsTools = Boolean(capabilities?.tools);
      const toolsResult = supportsTools ? await client.listTools(undefined, { timeout: timeoutMs }) : { tools: [] };
      const toolCount = Array.isArray(toolsResult.tools) ? toolsResult.tools.length : 0;
      const detail = supportsTools
        ? "Runtime probe completed successfully."
        : "Runtime probe completed. Server does not advertise tools capability.";

      return {
        transport: "stdio",
        status: "ready",
        detail,
        probedAt: checkedAt,
        toolCount,
        ...(serverInfo?.name ? { serverName: serverInfo.name } : {}),
        ...(serverInfo?.version ? { serverVersion: serverInfo.version } : {}),
      };
    }, timeoutMs, async () => {
      await closeClientQuietly(client, transport);
    });

    return result;
  } catch (error) {
    return {
      transport: "stdio",
      status: "failed",
      detail: summarizeProbeFailure(error, resolvedConfig.command, timeoutMs, stderrOutput),
      probedAt: checkedAt,
    };
  } finally {
    await closeClientQuietly(client, transport);
  }
}

async function withTimeout(work, timeoutMs, onTimeout) {
  let timeout;
  return await Promise.race([
    Promise.resolve().then(work),
    new Promise((_, reject) => {
      timeout = setTimeout(() => {
        Promise.resolve(onTimeout?.()).finally(() => {
          reject(new Error(`MCP runtime probe timed out after ${timeoutMs}ms.`));
        });
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

async function closeClientQuietly(client, transport) {
  try {
    await client.close();
    return;
  } catch {}

  try {
    await transport.close();
  } catch {}
}

function summarizeProbeFailure(error, command, timeoutMs, stderrOutput) {
  if (error instanceof Error && error.message === `MCP runtime probe timed out after ${timeoutMs}ms.`) {
    return error.message;
  }

  if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") {
    return `Command is not available on PATH: ${command}`;
  }

  const message = error instanceof Error ? error.message : String(error);
  const stderrLine = summarizeStderr(stderrOutput);
  return stderrLine ? `${message} ${stderrLine}` : message;
}

function summarizeStderr(stderrOutput) {
  const lastLine = stderrOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-1)[0];

  if (!lastLine) return "";
  return `stderr: ${redactText(lastLine)}`;
}

function redactText(value) {
  return String(value)
    .replace(/https?:\/\/[^\s"']+/g, "[redacted-url]")
    .replace(/[A-Za-z0-9_-]{20,}/g, "[redacted-token]");
}
