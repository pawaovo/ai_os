#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { homedir } from "node:os";
import { dirname, join, normalize, resolve } from "node:path";
import { createInterface } from "node:readline";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const productRoot = resolve(appRoot, "../..");
const publicRoot = join(appRoot, "public");
const port = Number.parseInt(process.env.PORT ?? "5173", 10);
const executorTimeoutMs = Number.parseInt(process.env.AI_SPACE_EXECUTOR_TIMEOUT_MS ?? "60000", 10);
const storageRoot = resolve(process.env.AI_SPACE_STORAGE_DIR ?? join(homedir(), ".ai_os", "space-demo"));

if (process.env.AI_SPACE_SKIP_BUILD !== "1") {
  buildProduct();
}

const {
  createProviderListResponse,
  createProviderSettingsResponse,
  parseChatSendRequest,
  parseProviderSettingsInput,
  parseSpaceDemoRunRequest,
  runChatSendRequest,
  runProviderDoctor,
  runSpaceDemoRequest,
} = await import(pathToImportUrl(join(appRoot, "dist/server-runtime.js")));

await mkdir(storageRoot, { recursive: true });

let processRunner;
let appStore;

async function handleRequest(request, response) {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  const pathname = requestUrl.pathname;

  if (request.method === "GET" && pathname === "/api/workspaces") {
    await handleListWorkspaces(response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/workspaces") {
    await handleCreateWorkspace(request, response);
    return;
  }

  if (request.method === "PATCH" && isWorkspacePath(pathname)) {
    await handleUpdateWorkspace(request, response, workspaceIdFromPath(pathname));
    return;
  }

  if (request.method === "DELETE" && isWorkspacePath(pathname)) {
    await handleDeleteWorkspace(response, workspaceIdFromPath(pathname));
    return;
  }

  if (request.method === "PATCH" && pathname === "/api/settings/workspace-selection") {
    await handleWorkspaceSelection(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/artifacts") {
    await handleListArtifacts(response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/artifacts") {
    await handleCreateArtifact(request, response);
    return;
  }

  if (request.method === "GET" && isArtifactPath(pathname)) {
    await handleGetArtifact(response, artifactIdFromPath(pathname));
    return;
  }

  if (request.method === "DELETE" && isArtifactPath(pathname)) {
    await handleDeleteArtifact(response, artifactIdFromPath(pathname));
    return;
  }

  if (request.method === "GET" && pathname === "/api/runs") {
    await handleListRuns(response);
    return;
  }

  if (request.method === "GET" && isRunEventsPath(pathname)) {
    await handleRunEvents(response, runIdFromPath(pathname));
    return;
  }

  if (request.method === "GET" && pathname === "/api/providers") {
    await handleListProviders(response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/providers") {
    await handleSaveProvider(request, response);
    return;
  }

  if (request.method === "PATCH" && isProviderPath(pathname)) {
    await handleSaveProvider(request, response, providerIdFromPath(pathname));
    return;
  }

  if (request.method === "DELETE" && isProviderPath(pathname)) {
    await handleDeleteProvider(response, providerIdFromPath(pathname));
    return;
  }

  if (request.method === "POST" && pathname === "/api/providers/doctor") {
    await handleProviderDoctor(request, response);
    return;
  }

  if (request.method === "GET" && isProviderModelsPath(pathname)) {
    await handleProviderModels(response, providerIdFromPath(pathname));
    return;
  }

  if (request.method === "PATCH" && pathname === "/api/settings/model-selection") {
    await handleModelSelection(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/threads") {
    await handleListThreads(response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/threads") {
    await handleCreateThread(request, response);
    return;
  }

  if (request.method === "PATCH" && isThreadPath(pathname)) {
    await handleUpdateThread(request, response, threadIdFromPath(pathname));
    return;
  }

  if (request.method === "DELETE" && isThreadPath(pathname)) {
    await handleDeleteThread(response, threadIdFromPath(pathname));
    return;
  }

  if (request.method === "GET" && isThreadMessagesPath(pathname)) {
    await handleThreadMessages(response, threadIdFromPath(pathname));
    return;
  }

  if (request.method === "POST" && isThreadMessagesPath(pathname)) {
    await handleThreadChatSend(request, response, threadIdFromPath(pathname));
    return;
  }

  if (request.method === "GET" && pathname === "/api/provider") {
    await handleGetProvider(response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/provider") {
    await handleSaveProvider(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/chat/send") {
    await handleChatSend(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/demo/run") {
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
}

function buildProduct() {
  execFileSync(process.execPath, ["./node_modules/typescript/bin/tsc", "-b"], {
    cwd: productRoot,
    stdio: "inherit",
  });
}

async function handleListWorkspaces(response) {
  writeJson(response, 200, appStore.listWorkspaces());
}

async function handleCreateWorkspace(request, response) {
  const body = await readJsonBody(request);
  const workspace = appStore.createWorkspace({
    name: readRequiredString(body.name, "name"),
    path: readOptionalString(body.path),
  });

  writeJson(response, 200, { workspace });
}

async function handleUpdateWorkspace(request, response, workspaceId) {
  const body = await readJsonBody(request);
  const workspace = appStore.updateWorkspace(workspaceId, {
    name: readOptionalString(body.name),
    path: readOptionalString(body.path),
  });

  writeJson(response, 200, { workspace });
}

async function handleDeleteWorkspace(response, workspaceId) {
  appStore.deleteWorkspace(workspaceId);
  writeJson(response, 200, appStore.listWorkspaces());
}

async function handleWorkspaceSelection(request, response) {
  try {
    const body = await readJsonBody(request);
    const workspaceId = readRequiredString(body.workspaceId, "workspaceId");
    appStore.activateWorkspace(workspaceId);
    writeJson(response, 200, { activeWorkspaceId: workspaceId });
  } catch (error) {
    writeJson(response, 400, { error: sanitizeErrorMessage(error) });
  }
}

async function handleListArtifacts(response) {
  writeJson(response, 200, appStore.listArtifacts(appStore.getSetting("activeWorkspaceId")));
}

async function handleCreateArtifact(request, response) {
  const body = await readJsonBody(request);
  const artifact = appStore.createArtifact({
    title: readRequiredString(body.title, "title"),
    kind: readOptionalString(body.kind) ?? "markdown",
    content: readOptionalString(body.content) ?? "",
    path: readOptionalString(body.path),
    workspaceId: readOptionalString(body.workspaceId) ?? appStore.getSetting("activeWorkspaceId"),
    threadId: readOptionalString(body.threadId) ?? appStore.getSetting("activeThreadId"),
    runId: readOptionalString(body.runId),
    source: readOptionalString(body.source) ?? "manual",
  });

  writeJson(response, 200, { artifact });
}

async function handleGetArtifact(response, artifactId) {
  const artifact = appStore.getArtifact(artifactId);
  const activeWorkspaceId = appStore.getSetting("activeWorkspaceId");

  if (!artifact || (activeWorkspaceId && artifact.workspaceId !== activeWorkspaceId)) {
    writeJson(response, 404, { error: "Artifact not found in active workspace." });
    return;
  }

  writeJson(response, 200, { artifact });
}

async function handleDeleteArtifact(response, artifactId) {
  appStore.deleteArtifact(artifactId);
  writeJson(response, 200, appStore.listArtifacts(appStore.getSetting("activeWorkspaceId")));
}

async function handleListRuns(response) {
  writeJson(response, 200, appStore.listRuns(appStore.getSetting("activeWorkspaceId")));
}

async function handleRunEvents(response, runId) {
  const run = appStore.getRun(runId);
  const activeWorkspaceId = appStore.getSetting("activeWorkspaceId");

  if (!run || (activeWorkspaceId && run.workspaceId !== activeWorkspaceId)) {
    writeJson(response, 404, { error: "Run not found in active workspace." });
    return;
  }

  writeJson(response, 200, { events: appStore.listRunEvents(runId) });
}

async function handleListProviders(response) {
  writeJson(
    response,
    200,
    createProviderListResponse(await appStore.listProviders(), appStore.getSetting("activeProviderId")),
  );
}

async function handleGetProvider(response) {
  writeJson(response, 200, createProviderSettingsResponse(await appStore.readActiveProvider()));
}

async function handleSaveProvider(request, response, pathProviderId) {
  try {
    const body = await readJsonBody(request);
    const providerId = pathProviderId ?? readOptionalString(body.id);
    const existing = providerId ? await appStore.readProvider(providerId) : await appStore.readActiveProvider();
    const provider = parseProviderSettingsInput(
      { ...body, ...(providerId ? { id: providerId } : {}) },
      existing,
    );
    const saved = await appStore.writeProvider(provider);

    writeJson(response, 200, createProviderSettingsResponse(saved));
  } catch (error) {
    writeJson(response, 400, { error: sanitizeErrorMessage(error) });
  }
}

async function handleDeleteProvider(response, providerId) {
  await appStore.deleteProvider(providerId);
  await handleListProviders(response);
}

async function handleProviderDoctor(request, response) {
  try {
    const body = await readJsonBody(request);
    const providerId = readOptionalString(body.providerId) ?? readOptionalString(body.id);
    const existing = providerId ? await appStore.readProvider(providerId) : await appStore.readActiveProvider();
    const provider = parseProviderSettingsInput(
      { ...existing, ...body, ...(providerId ? { id: providerId } : {}) },
      existing,
    );

    writeJson(response, 200, await runProviderDoctor({ provider, fetch: globalThis.fetch }));
  } catch (error) {
    writeJson(response, 400, {
      available: false,
      message: sanitizeErrorMessage(error),
      models: [],
    });
  }
}

async function handleProviderModels(response, providerId) {
  const provider = await appStore.readProvider(providerId);
  writeJson(response, 200, await runProviderDoctor({ provider, fetch: globalThis.fetch }));
}

async function handleModelSelection(request, response) {
  const body = await readJsonBody(request);
  const providerId = readRequiredString(body.providerId, "providerId");
  const modelId = readRequiredString(body.modelId, "modelId");

  appStore.setSetting("activeProviderId", providerId);
  appStore.setSetting("activeModelId", modelId);
  appStore.updateProviderModel(providerId, modelId);

  writeJson(response, 200, { activeProviderId: providerId, activeModelId: modelId });
}

async function handleListThreads(response) {
  writeJson(response, 200, appStore.listThreads(appStore.getSetting("activeWorkspaceId")));
}

async function handleCreateThread(request, response) {
  const body = await readJsonBody(request);
  const activeProvider = await appStore.readActiveProvider();
  const thread = appStore.createThread({
    title: readOptionalString(body.title) ?? "New Thread",
    providerId: readOptionalString(body.providerId) ?? activeProvider?.id,
    modelId: readOptionalString(body.modelId) ?? activeProvider?.modelId,
    workspaceId: readOptionalString(body.workspaceId) ?? appStore.getSetting("activeWorkspaceId"),
  });

  writeJson(response, 200, { thread, messages: [] });
}

async function handleUpdateThread(request, response, threadId) {
  const body = await readJsonBody(request);
  writeJson(response, 200, {
    thread: appStore.updateThread(threadId, {
      title: readOptionalString(body.title),
      providerId: readOptionalString(body.providerId),
      modelId: readOptionalString(body.modelId),
      workspaceId: readOptionalString(body.workspaceId),
    }),
  });
}

async function handleDeleteThread(response, threadId) {
  appStore.deleteThread(threadId);
  writeJson(response, 200, appStore.listThreads(appStore.getSetting("activeWorkspaceId")));
}

async function handleThreadMessages(response, threadId) {
  writeJson(response, 200, {
    thread: appStore.getThread(threadId),
    messages: appStore.listMessages(threadId),
  });
}

async function handleThreadChatSend(request, response, threadId) {
  try {
    await handleChatSendWithThread(response, { ...(await readJsonBody(request)), threadId });
  } catch (error) {
    writeJson(response, 400, { error: sanitizeErrorMessage(error) });
  }
}

async function handleChatSend(request, response) {
  try {
    await handleChatSendWithThread(response, await readJsonBody(request));
  } catch (error) {
    writeJson(response, 400, { error: sanitizeErrorMessage(error) });
  }
}

async function handleChatSendWithThread(response, body) {
  const chatRequest = parseChatSendRequest(body);
  const thread = await appStore.ensureThread(chatRequest.threadId);
  const provider = await appStore.readProvider(
    chatRequest.providerId ?? thread.providerId ?? appStore.getSetting("activeProviderId"),
  );

  if (!provider) {
    throw new Error("Configure a model provider before chatting.");
  }

  const history = appStore.listMessages(thread.id).map(({ role, content }) => ({ role, content }));
  const userMessage = appStore.addMessage({
    threadId: thread.id,
    role: "user",
    content: chatRequest.message,
    providerId: provider.id,
    modelId: provider.modelId,
    status: "completed",
  });

  try {
    const payload = await runChatSendRequest({
      request: { ...chatRequest, threadId: thread.id, providerId: provider.id, history },
      provider,
      fetch: globalThis.fetch,
    });
    const assistantMessage = appStore.addMessage({
      threadId: thread.id,
      role: "assistant",
      content: payload.assistantMessage,
      providerId: provider.id,
      modelId: provider.modelId,
      status: "completed",
    });
    appStore.createArtifact({
      title: `Chat response: ${userMessage.content.slice(0, 40)}`,
      kind: "markdown",
      content: payload.assistantMessage,
      workspaceId: thread.workspaceId ?? appStore.getSetting("activeWorkspaceId"),
      threadId: thread.id,
      source: "chat",
    });

    appStore.touchThread(thread.id, titleFromMessage(thread.title, userMessage.content));
    writeJson(response, 200, {
      thread: appStore.getThread(thread.id),
      threadId: thread.id,
      messages: appStore.listMessages(thread.id),
      assistantMessage,
    });
  } catch (error) {
    appStore.addMessage({
      threadId: thread.id,
      role: "system",
      content: sanitizeErrorMessage(error),
      providerId: provider.id,
      modelId: provider.modelId,
      status: "failed",
      error: sanitizeErrorMessage(error),
    });
    throw error;
  }
}

async function handleRunRequest(request, response) {
  try {
    const runRequest = parseSpaceDemoRunRequest(await readJsonBody(request));
    const payload = await runSpaceDemoRequest(runRequest, { runner: processRunner });
    appStore.recordRunFromDemo(runRequest, payload.state);
    writeJson(response, 200, payload);
  } catch (error) {
    writeJson(response, 400, { error: sanitizeErrorMessage(error) });
  }
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) throw new Error("Request body is too large.");
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

  if (url.pathname === "/" || url.pathname === "/index.html") return join(publicRoot, "index.html");
  if (url.pathname === "/assets/styles.css") return join(publicRoot, "styles.css");

  if (url.pathname.startsWith("/apps/") || url.pathname.startsWith("/packages/")) {
    const filePath = normalize(join(productRoot, decodeURIComponent(url.pathname)));
    if (!filePath.startsWith(productRoot)) throw new NotFoundError();
    if (!(await stat(filePath)).isFile()) throw new NotFoundError();
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

function isProviderPath(pathname) {
  return /^\/api\/providers\/[^/]+$/.test(pathname);
}

function isProviderModelsPath(pathname) {
  return /^\/api\/providers\/[^/]+\/models$/.test(pathname);
}

function providerIdFromPath(pathname) {
  return decodeURIComponent(pathname.split("/")[3] ?? "");
}

function isWorkspacePath(pathname) {
  return /^\/api\/workspaces\/[^/]+$/.test(pathname);
}

function workspaceIdFromPath(pathname) {
  return decodeURIComponent(pathname.split("/")[3] ?? "");
}

function isArtifactPath(pathname) {
  return /^\/api\/artifacts\/[^/]+$/.test(pathname);
}

function artifactIdFromPath(pathname) {
  return decodeURIComponent(pathname.split("/")[3] ?? "");
}

function isRunEventsPath(pathname) {
  return /^\/api\/runs\/[^/]+\/events$/.test(pathname);
}

function runIdFromPath(pathname) {
  return decodeURIComponent(pathname.split("/")[3] ?? "");
}

function isThreadPath(pathname) {
  return /^\/api\/threads\/[^/]+$/.test(pathname);
}

function isThreadMessagesPath(pathname) {
  return /^\/api\/threads\/[^/]+\/messages$/.test(pathname);
}

function threadIdFromPath(pathname) {
  return decodeURIComponent(pathname.split("/")[3] ?? "");
}

function readRequiredString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`Missing required field: ${field}`);
  return value.trim();
}

function readOptionalString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function titleFromMessage(currentTitle, message) {
  if (currentTitle !== "New Thread") return currentTitle;
  return message.slice(0, 48) || currentTitle;
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return redactProcessOutput(message);
}

class SqliteAppStore {
  constructor(dbPath, secretStore) {
    this.db = new DatabaseSync(dbPath);
    this.secretStore = secretStore;
    this.init();
  }

  init() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        protocol TEXT NOT NULL,
        base_url TEXT NOT NULL,
        model_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        provider_id TEXT,
        model_id TEXT,
        workspace_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        provider_id TEXT,
        model_id TEXT,
        status TEXT NOT NULL,
        error TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        kind TEXT NOT NULL,
        content TEXT,
        path TEXT,
        workspace_id TEXT,
        thread_id TEXT,
        run_id TEXT,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        goal TEXT NOT NULL,
        executor_choice TEXT NOT NULL,
        status TEXT NOT NULL,
        workspace_id TEXT,
        thread_id TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS run_events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    this.addColumnIfMissing("threads", "workspace_id", "TEXT");
  }

  addColumnIfMissing(table, column, type) {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all();
    if (columns.some((entry) => entry.name === column)) return;
    this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }

  getSetting(key) {
    return this.db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key)?.value;
  }

  setSetting(key, value) {
    this.db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  }

  deleteSetting(key) {
    this.db.prepare("DELETE FROM app_settings WHERE key = ?").run(key);
  }

  listWorkspaces() {
    const workspaces = this.db.prepare("SELECT * FROM workspaces ORDER BY updated_at DESC").all().map(workspaceRowToSummary);
    const activeWorkspaceId = this.getSetting("activeWorkspaceId");
    return { workspaces, ...(activeWorkspaceId ? { activeWorkspaceId } : {}) };
  }

  createWorkspace(input) {
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO workspaces (id, name, path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, input.name, input.path ?? null, timestamp, timestamp);
    this.setSetting("activeWorkspaceId", id);
    return this.getWorkspace(id);
  }

  getWorkspace(id) {
    if (!id) return undefined;
    const row = this.db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id);
    return row ? workspaceRowToSummary(row) : undefined;
  }

  updateWorkspace(id, input) {
    const current = this.getWorkspace(id);
    if (!current) throw new Error("Workspace not found.");
    this.db.prepare(`
      UPDATE workspaces
      SET name = ?, path = COALESCE(?, path), updated_at = ?
      WHERE id = ?
    `).run(input.name ?? current.name, input.path ?? null, nowIso(), id);
    this.setSetting("activeWorkspaceId", id);
    return this.getWorkspace(id);
  }

  deleteWorkspace(id) {
    this.db.prepare("DELETE FROM workspaces WHERE id = ?").run(id);
    this.db.prepare("UPDATE threads SET workspace_id = NULL WHERE workspace_id = ?").run(id);
    this.db.prepare("UPDATE artifacts SET workspace_id = NULL WHERE workspace_id = ?").run(id);
    this.db.prepare("UPDATE runs SET workspace_id = NULL WHERE workspace_id = ?").run(id);
    if (this.getSetting("activeWorkspaceId") === id) {
      this.db.prepare("DELETE FROM app_settings WHERE key = 'activeWorkspaceId'").run();
    }
  }

  activateWorkspace(id) {
    const workspace = this.getWorkspace(id);
    if (!workspace) throw new Error("Workspace not found.");

    this.setSetting("activeWorkspaceId", id);

    const activeThreadId = this.getSetting("activeThreadId");
    const activeThread = activeThreadId ? this.getThread(activeThreadId) : undefined;
    if (activeThread && activeThread.workspaceId !== id) {
      this.deleteSetting("activeThreadId");
    }

    return workspace;
  }

  async listProviders() {
    const providers = [];
    for (const row of this.db.prepare("SELECT * FROM providers ORDER BY updated_at DESC").all()) {
      providers.push(await this.toProvider(row));
    }
    return providers;
  }

  async readActiveProvider() {
    const activeId = this.getSetting("activeProviderId");
    if (activeId) {
      const active = await this.readProvider(activeId);
      if (active) return active;
    }
    const row = this.db.prepare("SELECT * FROM providers ORDER BY updated_at DESC LIMIT 1").get();
    return row ? this.toProvider(row) : undefined;
  }

  async readProvider(id) {
    if (!id) return undefined;
    const row = this.db.prepare("SELECT * FROM providers WHERE id = ?").get(id);
    return row ? this.toProvider(row) : undefined;
  }

  async writeProvider(provider) {
    const id = provider.id ?? randomUUID();
    const timestamp = nowIso();
    const createdAt = this.db.prepare("SELECT created_at FROM providers WHERE id = ?").get(id)?.created_at ?? timestamp;

    await this.secretStore.setProviderApiKey(id, provider.apiKey);
    this.db.prepare(`
      INSERT INTO providers (id, name, protocol, base_url, model_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        protocol = excluded.protocol,
        base_url = excluded.base_url,
        model_id = excluded.model_id,
        updated_at = excluded.updated_at
    `).run(id, provider.name, provider.protocol, provider.baseUrl, provider.modelId, createdAt, timestamp);
    this.setSetting("activeProviderId", id);
    this.setSetting("activeModelId", provider.modelId);
    return this.readProvider(id);
  }

  async deleteProvider(id) {
    await this.secretStore.deleteProviderApiKey(id);
    this.db.prepare("DELETE FROM providers WHERE id = ?").run(id);
    if (this.getSetting("activeProviderId") === id) {
      this.db.prepare("DELETE FROM app_settings WHERE key IN ('activeProviderId', 'activeModelId')").run();
    }
  }

  updateProviderModel(id, modelId) {
    this.db.prepare("UPDATE providers SET model_id = ?, updated_at = ? WHERE id = ?").run(modelId, nowIso(), id);
  }

  async toProvider(row) {
    return {
      id: row.id,
      name: row.name,
      protocol: row.protocol,
      baseUrl: row.base_url,
      apiKey: (await this.secretStore.getProviderApiKey(row.id)) ?? "",
      modelId: row.model_id,
    };
  }

  listThreads(workspaceId) {
    const rows = workspaceId
      ? this.db.prepare(`
      SELECT t.*, COUNT(m.id) AS message_count,
        (SELECT content FROM messages WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message_preview
      FROM threads t
      LEFT JOIN messages m ON m.thread_id = t.id
      WHERE t.workspace_id = ?
      GROUP BY t.id
      ORDER BY t.updated_at DESC
    `).all(workspaceId)
      : this.db.prepare(`
      SELECT t.*, COUNT(m.id) AS message_count,
        (SELECT content FROM messages WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message_preview
      FROM threads t
      LEFT JOIN messages m ON m.thread_id = t.id
      GROUP BY t.id
      ORDER BY t.updated_at DESC
    `).all();

    const threads = rows.map(threadRowToSummary);
    const activeThreadId = this.getSetting("activeThreadId");
    const activeThreadIsVisible = threads.some((thread) => thread.id === activeThreadId);
    return { threads, ...(activeThreadId && activeThreadIsVisible ? { activeThreadId } : {}) };
  }

  createThread(input = {}) {
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO threads (id, title, provider_id, model_id, workspace_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.title ?? "New Thread",
      input.providerId ?? null,
      input.modelId ?? null,
      input.workspaceId ?? this.getSetting("activeWorkspaceId") ?? null,
      timestamp,
      timestamp,
    );
    this.setSetting("activeThreadId", id);
    return this.getThread(id);
  }

  async ensureThread(threadId) {
    const activeWorkspaceId = this.getSetting("activeWorkspaceId");

    if (threadId) {
      const thread = this.getThread(threadId);
      if (thread) return thread;
    }
    const activeThreadId = this.getSetting("activeThreadId");
    if (activeThreadId) {
      const activeThread = this.getThread(activeThreadId);
      if (activeThread && (!activeWorkspaceId || activeThread.workspaceId === activeWorkspaceId)) return activeThread;
    }
    const activeProvider = await this.readActiveProvider();
    return this.createThread({
      providerId: activeProvider?.id,
      modelId: activeProvider?.modelId,
      workspaceId: activeWorkspaceId,
    });
  }

  getThread(id) {
    const row = this.db.prepare(`
      SELECT t.*, COUNT(m.id) AS message_count,
        (SELECT content FROM messages WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message_preview
      FROM threads t
      LEFT JOIN messages m ON m.thread_id = t.id
      WHERE t.id = ?
      GROUP BY t.id
    `).get(id);
    return row ? threadRowToSummary(row) : undefined;
  }

  updateThread(id, input) {
    const current = this.getThread(id);
    if (!current) throw new Error("Thread not found.");
    this.db.prepare(`
      UPDATE threads
      SET
        title = ?,
        provider_id = COALESCE(?, provider_id),
        model_id = COALESCE(?, model_id),
        workspace_id = COALESCE(?, workspace_id),
        updated_at = ?
      WHERE id = ?
    `).run(
      input.title ?? current.title,
      input.providerId ?? null,
      input.modelId ?? null,
      input.workspaceId ?? null,
      nowIso(),
      id,
    );
    this.setSetting("activeThreadId", id);
    return this.getThread(id);
  }

  touchThread(id, title) {
    this.db.prepare("UPDATE threads SET title = ?, updated_at = ? WHERE id = ?").run(title, nowIso(), id);
  }

  deleteThread(id) {
    this.db.prepare("DELETE FROM messages WHERE thread_id = ?").run(id);
    this.db.prepare("DELETE FROM threads WHERE id = ?").run(id);
    if (this.getSetting("activeThreadId") === id) {
      this.db.prepare("DELETE FROM app_settings WHERE key = 'activeThreadId'").run();
    }
  }

  listMessages(threadId) {
    return this.db.prepare("SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC").all(threadId).map(messageRowToUi);
  }

  addMessage(input) {
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO messages (id, thread_id, role, content, provider_id, model_id, status, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.threadId,
      input.role,
      input.content,
      input.providerId ?? null,
      input.modelId ?? null,
      input.status ?? "completed",
      input.error ?? null,
      timestamp,
    );
    return messageRowToUi(this.db.prepare("SELECT * FROM messages WHERE id = ?").get(id));
  }

  createArtifact(input) {
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO artifacts (id, title, kind, content, path, workspace_id, thread_id, run_id, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.title,
      input.kind ?? "markdown",
      input.content ?? "",
      input.path ?? null,
      input.workspaceId ?? null,
      input.threadId ?? null,
      input.runId ?? null,
      input.source ?? "manual",
      timestamp,
      timestamp,
    );
    return this.getArtifact(id);
  }

  getArtifact(id) {
    const row = this.db.prepare("SELECT * FROM artifacts WHERE id = ?").get(id);
    return row ? artifactRowToSummary(row) : undefined;
  }

  listArtifacts(workspaceId) {
    const rows = workspaceId
      ? this.db.prepare("SELECT * FROM artifacts WHERE workspace_id = ? ORDER BY updated_at DESC").all(workspaceId)
      : this.db.prepare("SELECT * FROM artifacts ORDER BY updated_at DESC").all();
    return { artifacts: rows.map(artifactRowToSummary) };
  }

  deleteArtifact(id) {
    this.db.prepare("DELETE FROM artifacts WHERE id = ?").run(id);
  }

  recordRunFromDemo(request, state) {
    const runId = state.summary?.runId ?? randomUUID();
    const timestamp = nowIso();
    const workspaceId = this.getSetting("activeWorkspaceId");
    const threadId = this.getSetting("activeThreadId");

    this.db.prepare(`
      INSERT INTO runs (id, goal, executor_choice, status, workspace_id, thread_id, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        completed_at = excluded.completed_at
    `).run(runId, request.goal, request.executorChoice, state.phase, workspaceId ?? null, threadId ?? null, timestamp, timestamp);

    for (const event of state.events) {
      this.db.prepare(`
        INSERT INTO run_events (id, run_id, type, message, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(randomUUID(), runId, event.type, event.message, timestamp);
    }

    for (const artifact of state.artifacts) {
      this.createArtifact({
        title: artifact.title,
        kind: artifact.kind,
        content: state.artifactContents[artifact.id] ?? "",
        path: artifact.path,
        workspaceId,
        threadId,
        runId,
        source: "run",
      });
    }
  }

  listRuns(workspaceId) {
    const rows = workspaceId
      ? this.db.prepare("SELECT * FROM runs WHERE workspace_id = ? ORDER BY started_at DESC").all(workspaceId)
      : this.db.prepare("SELECT * FROM runs ORDER BY started_at DESC").all();
    return { runs: rows.map(runRowToSummary) };
  }

  getRun(id) {
    const row = this.db.prepare("SELECT * FROM runs WHERE id = ?").get(id);
    return row ? runRowToSummary(row) : undefined;
  }

  listRunEvents(runId) {
    return this.db.prepare("SELECT * FROM run_events WHERE run_id = ? ORDER BY created_at ASC").all(runId).map(runEventRowToSummary);
  }
}

function threadRowToSummary(row) {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.provider_id ? { providerId: row.provider_id } : {}),
    ...(row.model_id ? { modelId: row.model_id } : {}),
    ...(row.workspace_id ? { workspaceId: row.workspace_id } : {}),
    messageCount: Number(row.message_count ?? 0),
    ...(row.last_message_preview ? { lastMessagePreview: String(row.last_message_preview).slice(0, 120) } : {}),
  };
}

function workspaceRowToSummary(row) {
  return {
    id: row.id,
    name: row.name,
    ...(row.path ? { path: row.path } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function artifactRowToSummary(row) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    content: row.content ?? "",
    ...(row.path ? { path: row.path } : {}),
    ...(row.workspace_id ? { workspaceId: row.workspace_id } : {}),
    ...(row.thread_id ? { threadId: row.thread_id } : {}),
    ...(row.run_id ? { runId: row.run_id } : {}),
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function runRowToSummary(row) {
  return {
    id: row.id,
    goal: row.goal,
    executorChoice: row.executor_choice,
    status: row.status,
    ...(row.workspace_id ? { workspaceId: row.workspace_id } : {}),
    ...(row.thread_id ? { threadId: row.thread_id } : {}),
    startedAt: row.started_at,
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}

function runEventRowToSummary(row) {
  return {
    id: row.id,
    runId: row.run_id,
    type: row.type,
    message: row.message,
    createdAt: row.created_at,
  };
}

function messageRowToUi(row) {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    ...(row.provider_id ? { providerId: row.provider_id } : {}),
    ...(row.model_id ? { modelId: row.model_id } : {}),
    status: row.status,
    ...(row.error ? { error: row.error } : {}),
  };
}

function createSecretStore(root) {
  if (process.env.AI_SPACE_SECRET_BACKEND === "file") return new FileSecretStore(join(root, "secrets.json"));
  return new KeychainSecretStore("AI OS Space Demo Provider");
}

class KeychainSecretStore {
  constructor(service) {
    this.service = service;
  }

  async getProviderApiKey(providerId) {
    try {
      return execFileSync("/usr/bin/security", ["find-generic-password", "-s", this.service, "-a", providerId, "-w"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return undefined;
    }
  }

  async setProviderApiKey(providerId, value) {
    execFileSync("/usr/bin/security", ["add-generic-password", "-U", "-s", this.service, "-a", providerId, "-w", value], {
      stdio: "ignore",
    });
  }

  async deleteProviderApiKey(providerId) {
    try {
      execFileSync("/usr/bin/security", ["delete-generic-password", "-s", this.service, "-a", providerId], {
        stdio: "ignore",
      });
    } catch {
      // Missing Keychain entries are already deleted from the product perspective.
    }
  }
}

class FileSecretStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async readAll() {
    try {
      return JSON.parse(await readFile(this.filePath, "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") return {};
      throw error;
    }
  }

  async writeAll(value) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(value, null, 2), "utf8");
  }

  async getProviderApiKey(providerId) {
    return (await this.readAll())[providerId];
  }

  async setProviderApiKey(providerId, value) {
    await this.writeAll({ ...(await this.readAll()), [providerId]: value });
  }

  async deleteProviderApiKey(providerId) {
    const secrets = await this.readAll();
    delete secrets[providerId];
    if (Object.keys(secrets).length === 0) {
      await rm(this.filePath, { force: true });
      return;
    }
    await this.writeAll(secrets);
  }
}

class NodeProcessRunner {
  constructor(defaultCwd, timeoutMs) {
    this.defaultCwd = defaultCwd;
    this.timeoutMs = timeoutMs;
  }

  async isAvailable(command) {
    return new Promise((resolve) => {
      const child = spawn(command, ["--version"], { cwd: this.defaultCwd, stdio: "ignore" });
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
    let lastStdoutLine = "";
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, this.timeoutMs);
    const spawnError = new Promise((_, reject) => child.once("error", reject));
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.stdin.end(command.input ?? "");

    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    for await (const line of lines) {
      lastStdoutLine = line;
      yield line;
    }

    const [code] = await Promise.race([once(child, "close"), spawnError]).finally(() => clearTimeout(timeout));
    if (timedOut) {
      throw new Error(`${command.command} exceeded ${this.timeoutMs}ms demo timeout.${summarizeProcessOutput(lastStdoutLine)}`);
    }
    if (code !== 0) throw new Error(stderr.trim() || `${command.command} exited with code ${code}`);
  }
}

function summarizeProcessOutput(line) {
  if (!line) return "";
  try {
    const event = JSON.parse(line);
    const parts = [
      event.type,
      event.subtype,
      event.error_status ? `HTTP ${event.error_status}` : undefined,
      typeof event.error === "string" ? event.error : undefined,
    ].filter(Boolean);
    if (parts.length > 0) return ` Last process event: ${parts.join(" / ")}.`;
  } catch {
    const trimmed = line.trim();
    if (trimmed.length > 0) return ` Last process output: ${redactProcessOutput(trimmed).slice(0, 180)}.`;
  }
  return "";
}

function redactProcessOutput(value) {
  return value
    .replace(/https?:\/\/[^\s"']+/g, "[redacted-url]")
    .replace(/[A-Za-z0-9_-]{20,}/g, "[redacted-token]");
}

class NotFoundError extends Error {}

processRunner = new NodeProcessRunner(productRoot, executorTimeoutMs);
appStore = new SqliteAppStore(join(storageRoot, "app.db"), createSecretStore(storageRoot));

const server = createServer(async (request, response) => {
  try {
    await handleRequest(request, response);
  } catch (error) {
    const status = error instanceof NotFoundError ? 404 : 500;
    response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
    response.end(status === 404 ? "Not found" : sanitizeErrorMessage(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`AI Space Demo: http://127.0.0.1:${port}\n`);
});
