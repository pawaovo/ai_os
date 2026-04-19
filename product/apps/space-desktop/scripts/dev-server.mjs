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
const automationTickMs = Number.parseInt(process.env.AI_SPACE_AUTOMATION_TICK_MS ?? "1000", 10);
const codexCommand = process.env.AI_SPACE_CODEX_COMMAND;
const claudeCommand = process.env.AI_SPACE_CLAUDE_COMMAND;
const storageRoot = resolve(process.env.AI_SPACE_STORAGE_DIR ?? join(homedir(), ".ai_os", "space-demo"));
const SPACE_RUNTIME_SPACE_ID = "space-local-runtime";

if (process.env.AI_SPACE_SKIP_BUILD !== "1") {
  buildProduct();
}

const {
  createCodeExecutorForChoice,
  createProviderListResponse,
  createProviderSettingsResponse,
  getExecutorRuntimeStatus,
  parseChatSendRequest,
  parseProviderSettingsInput,
  parseSpaceDemoRunRequest,
  runChatSendRequest,
  runProviderDoctor,
  runSpaceDemoRequest,
} = await import(pathToImportUrl(join(appRoot, "dist/server-runtime.js")));
const {
  ControlPlane,
  createRunSnapshot,
  reduceRunSnapshot,
} = await import(pathToImportUrl(join(productRoot, "packages/control/control-plane/dist/index.js")));
const {
  assessRunApproval,
  normalizeApprovalDecision,
  normalizeWorkspaceTrustLevel,
} = await import(pathToImportUrl(join(productRoot, "packages/control/approval-core/dist/index.js")));

await mkdir(storageRoot, { recursive: true });

let processRunner;
let appStore;
const runSessions = new Map();
let automationInterval;

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

  if (request.method === "GET" && pathname === "/api/approvals") {
    await handleListApprovals(response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/automations") {
    await handleListAutomations(response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/automations") {
    await handleCreateAutomation(request, response);
    return;
  }

  if (request.method === "PATCH" && isAutomationPath(pathname)) {
    await handleUpdateAutomation(request, response, automationIdFromPath(pathname));
    return;
  }

  if (request.method === "DELETE" && isAutomationPath(pathname)) {
    await handleDeleteAutomation(response, automationIdFromPath(pathname));
    return;
  }

  if (request.method === "POST" && pathname === "/api/automations/tick") {
    await handleAutomationTick(response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/automation-runs") {
    await handleListAutomationRuns(response);
    return;
  }

  if (request.method === "GET" && pathname === "/api/runs") {
    await handleListRuns(response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/runs/start") {
    await handleStartRun(request, response);
    return;
  }

  if (request.method === "GET" && isRunLivePath(pathname)) {
    await handleRunLive(response, runIdFromPath(pathname));
    return;
  }

  if (request.method === "POST" && isRunCancelPath(pathname)) {
    await handleCancelRun(response, runIdFromPath(pathname));
    return;
  }

  if (request.method === "POST" && isRunApprovalPath(pathname)) {
    await handleRunApproval(request, response, runIdFromPath(pathname));
    return;
  }

  if (request.method === "GET" && isRunEventsPath(pathname)) {
    await handleRunEvents(response, runIdFromPath(pathname));
    return;
  }

  if (request.method === "GET" && pathname === "/api/executors") {
    await handleExecutorDoctor(response);
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
    trustLevel: normalizeWorkspaceTrustLevel(body.trustLevel),
  });

  writeJson(response, 200, { workspace });
}

async function handleUpdateWorkspace(request, response, workspaceId) {
  const body = await readJsonBody(request);
  const workspace = appStore.updateWorkspace(workspaceId, {
    name: readOptionalString(body.name),
    path: readOptionalString(body.path),
    trustLevel: body.trustLevel !== undefined ? normalizeWorkspaceTrustLevel(body.trustLevel) : undefined,
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

async function handleListApprovals(response) {
  writeJson(response, 200, appStore.listApprovals(appStore.getSetting("activeWorkspaceId")));
}

async function handleListAutomations(response) {
  writeJson(response, 200, appStore.listAutomations(appStore.getSetting("activeWorkspaceId")));
}

async function handleCreateAutomation(request, response) {
  try {
    const body = await readJsonBody(request);
    const automation = appStore.createAutomation({
      title: readRequiredString(body.title, "title"),
      kind: readAutomationKind(body.kind),
      prompt: readRequiredString(body.prompt, "prompt"),
      intervalMs: readOptionalPositiveNumber(body.intervalMs) ?? defaultAutomationIntervalMs(body.kind),
      workspaceId: appStore.getSetting("activeWorkspaceId"),
      nextRunAt: readOptionalDateString(body.nextRunAt) ?? nowIso(),
    });

    writeJson(response, 200, { automation });
  } catch (error) {
    writeJson(response, 400, { error: sanitizeErrorMessage(error) });
  }
}

async function handleUpdateAutomation(request, response, automationId) {
  try {
    const body = await readJsonBody(request);
    const automation = appStore.updateAutomation(automationId, {
      title: readOptionalString(body.title),
      prompt: readOptionalString(body.prompt),
      status: readOptionalAutomationStatus(body.status),
      intervalMs: readOptionalPositiveNumber(body.intervalMs),
      nextRunAt: readOptionalDateString(body.nextRunAt),
    });
    writeJson(response, 200, { automation });
  } catch (error) {
    writeJson(response, 400, { error: sanitizeErrorMessage(error) });
  }
}

async function handleDeleteAutomation(response, automationId) {
  appStore.deleteAutomation(automationId);
  writeJson(response, 200, appStore.listAutomations(appStore.getSetting("activeWorkspaceId")));
}

async function handleAutomationTick(response) {
  const runs = await runDueAutomations();
  writeJson(response, 200, { runs });
}

async function handleListAutomationRuns(response) {
  writeJson(response, 200, appStore.listAutomationRuns(appStore.getSetting("activeWorkspaceId")));
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

async function handleExecutorDoctor(response) {
  writeJson(response, 200, {
    executors: await listExecutorStatuses(),
  });
}

async function handleStartRun(request, response) {
  try {
    const body = await readJsonBody(request);
    const runRequest = parseSpaceDemoRunRequest(body);
    const session = await createRunSession({
      goal: runRequest.goal,
      executorChoice: runRequest.executorChoice,
      timeoutMs: readOptionalPositiveNumber(body.timeoutMs),
    });

    writeJson(response, 202, {
      run: appStore.getRun(session.runId),
      live: serializeRunSession(session),
    });
  } catch (error) {
    writeJson(response, 400, { error: sanitizeErrorMessage(error) });
  }
}

async function handleRunLive(response, runId) {
  const session = runSessions.get(runId);

  if (!session) {
    writeJson(response, 404, { error: "Run session not active." });
    return;
  }

  writeJson(response, 200, { live: serializeRunSession(session) });
}

async function handleCancelRun(response, runId) {
  try {
    const session = requireRunSession(runId);
    await cancelRunSession(session);
    writeJson(response, 200, { live: serializeRunSession(session) });
  } catch (error) {
    writeJson(response, 400, { error: sanitizeErrorMessage(error) });
  }
}

async function handleRunApproval(request, response, runId) {
  try {
    const session = requireRunSession(runId);
    const body = await readJsonBody(request);
    const decision = readRequiredString(body.decision, "decision");
    await resolveRunApproval(session, decision);
    writeJson(response, 200, { live: serializeRunSession(session) });
  } catch (error) {
    writeJson(response, 400, { error: sanitizeErrorMessage(error) });
  }
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

async function runDueAutomations() {
  const due = appStore.listDueAutomations(nowIso());
  const runs = [];

  for (const automation of due) {
    runs.push(await runAutomation(automation));
  }

  return runs;
}

async function runAutomation(automation) {
  const run = appStore.createAutomationRun({
    automationId: automation.id,
    workspaceId: automation.workspaceId,
    status: "running",
    startedAt: nowIso(),
  });
  const workspace = automation.workspaceId ? appStore.getWorkspace(automation.workspaceId) : undefined;
  const requirement = assessRunApproval({
    goal: automation.prompt,
    executorChoice: "mock",
    workspacePath: workspace?.path,
    trustLevel: normalizeWorkspaceTrustLevel(workspace?.trustLevel),
  });

  if (requirement && !requirement.autoDecision) {
    appStore.createApproval({
      id: `approval-${randomUUID()}`,
      runId: run.id,
      workspaceId: automation.workspaceId,
      executorChoice: "automation",
      category: requirement.category,
      riskLevel: requirement.riskLevel,
      reason: `Automation requires approval: ${requirement.reason}`,
      requestedAction: requirement.requestedAction,
      status: "pending",
    });
    const waiting = appStore.updateAutomationRun(run.id, {
      status: "waiting-approval",
      result: `Waiting for approval: ${requirement.category} / ${requirement.riskLevel}`,
      completedAt: nowIso(),
    });
    appStore.scheduleNextAutomation(automation, "waiting-approval");
    return waiting;
  }

  if (requirement?.autoDecision === "grant") {
    const approvalId = `approval-${randomUUID()}`;
    appStore.createApproval({
      id: approvalId,
      runId: run.id,
      workspaceId: automation.workspaceId,
      executorChoice: "automation",
      category: requirement.category,
      riskLevel: requirement.riskLevel,
      reason: `Automation auto-approved: ${requirement.reason}`,
      requestedAction: requirement.requestedAction,
      status: "pending",
    });
    appStore.resolveApproval(approvalId, {
      status: "granted",
      decision: "grant",
      note: "Auto-granted automation by trusted local workspace rule.",
    });
  }

  const result = createAutomationResult(automation);
  const artifact = appStore.createArtifact({
    title: `Automation result: ${automation.title}`,
    kind: "report",
    content: result,
    workspaceId: automation.workspaceId,
    source: "automation",
  });
  const completed = appStore.updateAutomationRun(run.id, {
    status: "completed",
    result,
    artifactId: artifact.id,
    completedAt: nowIso(),
  });

  appStore.scheduleNextAutomation(automation, "completed");
  return completed;
}

function createAutomationResult(automation) {
  return [
    `# ${automation.title}`,
    "",
    `Kind: ${automation.kind}`,
    `Prompt: ${automation.prompt}`,
    "",
    "Result:",
    automation.kind === "heartbeat"
      ? "Heartbeat follow-up is ready for review."
      : "Local automation ran and recorded this result.",
  ].join("\n");
}

async function listExecutorStatuses() {
  const runtime = createExecutorRuntime();
  const statuses = [];

  for (const choice of ["mock", "codex", "claude-code"]) {
    const status = await getExecutorRuntimeStatus(choice, runtime);
    statuses.push({
      choice,
      available: status.available,
      message: status.message ?? (status.available ? "Ready." : "Unavailable."),
    });
  }

  return statuses;
}

function createExecutorRuntime() {
  return {
    runner: processRunner,
    ...(codexCommand ? { codexCommand } : {}),
    ...(claudeCommand ? { claudeCommand } : {}),
  };
}

async function createRunSession(input) {
  const workspace = await requireRunnableWorkspace();
  const ids = createWorkflowIds();
  const clock = createWorkflowClock();
  const runId = ids.runId();
  const missionId = ids.missionId();
  const session = {
    runId,
    missionId,
    goal: input.goal,
    executorChoice: input.executorChoice,
    workspaceId: workspace.id,
    workspacePath: workspace.path,
    trustLevel: normalizeWorkspaceTrustLevel(workspace.trustLevel),
    threadId: appStore.getSetting("activeThreadId"),
    timeoutMs: input.timeoutMs,
    status: "queued",
    events: [],
    stream: [],
    artifacts: [],
    artifactContents: {},
    pendingApproval: undefined,
    completedAt: undefined,
    latestMessage: undefined,
    ids,
    clock,
    executor: undefined,
    promise: undefined,
  };

  runSessions.set(runId, session);
  const approvalRequirement = assessRunApproval({
    goal: session.goal,
    executorChoice: session.executorChoice,
    workspacePath: session.workspacePath,
    trustLevel: session.trustLevel,
  });
  session.pendingApproval = approvalRequirement ? createPreRunApproval(session, approvalRequirement) : undefined;
  appStore.createRunRecord({
    id: runId,
    goal: session.goal,
    executorChoice: session.executorChoice,
    status: session.pendingApproval ? "awaiting-approval" : "running",
    workspaceId: session.workspaceId,
    threadId: session.threadId,
    startedAt: clock.now(),
  });
  session.status = session.pendingApproval ? "awaiting-approval" : "running";

  if (session.pendingApproval) {
    if (session.pendingApproval.autoDecision === "grant") {
      appStore.resolveApproval(session.pendingApproval.approvalId, {
        status: "granted",
        decision: "grant",
        note: "Auto-granted by trusted local workspace rule.",
      });
      appendLiveEvent(session, {
        type: "approval.granted",
        message: `Auto-granted ${session.pendingApproval.category} (${session.pendingApproval.riskLevel}).`,
        approvalId: session.pendingApproval.approvalId,
      });
      session.pendingApproval = undefined;
      session.status = "running";
      appStore.updateRunStatus(session.runId, "running");
      session.promise = runSessionWork(session);
      return session;
    }

    appendLiveEvent(session, {
      type: "approval.requested",
      message: `${session.pendingApproval.reason} [${session.pendingApproval.category} / ${session.pendingApproval.riskLevel}]`,
      approvalId: session.pendingApproval.approvalId,
    });
  } else {
    session.promise = runSessionWork(session);
  }

  return session;
}

function createPreRunApproval(session, requirement) {
  const approvalId = `approval-${randomUUID()}`;

  appStore.createApproval({
    id: approvalId,
    runId: session.runId,
    workspaceId: session.workspaceId,
    executorChoice: session.executorChoice,
    category: requirement.category,
    riskLevel: requirement.riskLevel,
    reason: requirement.reason,
    requestedAction: requirement.requestedAction,
    status: "pending",
  });

  return {
    approvalId,
    ...requirement,
    stage: "pre-run",
  };
}

async function resolveRunApproval(session, decision) {
  if (!session.pendingApproval) {
    throw new Error("Run does not have a pending approval.");
  }

  const approvalDecision = normalizeApprovalDecision(decision);
  const approval = session.pendingApproval;
  appStore.resolveApproval(approval.approvalId, {
    status: approvalDecision === "grant" ? "granted" : "rejected",
    decision: approvalDecision,
    note: approvalDecision === "grant" ? "Granted by user." : "Rejected by user.",
  });

  appendLiveEvent(session, {
    type: approvalDecision === "grant" ? "approval.granted" : "approval.rejected",
    message: approvalDecision === "grant" ? "Approval granted." : "Approval rejected.",
    approvalId: approval.approvalId,
  });

  if (approval.stage === "pre-run") {
    session.pendingApproval = undefined;

    if (approvalDecision === "reject") {
      finalizeSession(session, "failed", "Approval rejected before run start.");
      return;
    }

    session.status = "running";
    appStore.updateRunStatus(session.runId, "running");
    session.promise = runSessionWork(session);
    return;
  }

  if (!session.executor) {
    throw new Error("Run executor is unavailable.");
  }

  session.pendingApproval = undefined;
  await session.executor.submitApproval(session.runId, {
    approvalId: approval.approvalId,
    decision: approvalDecision,
  });
}

async function cancelRunSession(session) {
  if (isTerminalRunStatus(session.status)) return;

  if (session.pendingApproval) {
    appStore.resolveApproval(session.pendingApproval.approvalId, {
      status: "rejected",
      decision: "reject",
      note: "Interrupted while waiting for approval.",
    });
    session.pendingApproval = undefined;
    await session.executor?.interruptRun(session.runId);
    finalizeSession(session, "interrupted", "Run interrupted while waiting for approval.");
    return;
  }

  if (!session.executor) {
    session.pendingApproval = undefined;
    finalizeSession(session, "interrupted", "Run interrupted before execution started.");
    return;
  }

  await session.executor.interruptRun(session.runId);
}

async function runSessionWork(session) {
  try {
    const executor = createExecutorForSession(session);
    const controlPlane = new ControlPlane(
      { missionId: () => session.missionId },
      session.clock,
    );
    session.executor = executor;

    const started = await controlPlane.startMissionRun({
      spaceId: SPACE_RUNTIME_SPACE_ID,
      threadId: session.threadId ?? `thread-run-${session.runId}`,
      workspaceId: session.workspaceId,
      goal: session.goal,
      executor,
      context: {
        cwd: session.workspacePath,
        ...(session.timeoutMs !== undefined ? { timeoutMs: session.timeoutMs } : {}),
      },
    });
    let snapshot = createRunSnapshot(started.run);

    for await (const event of started.events) {
      snapshot = reduceRunSnapshot(snapshot, event);
      appendKernelEvent(session, event);
    }

    const collectedArtifacts = await executor.collectArtifacts(started.run.id);
    const artifacts = await persistSessionArtifacts(session, collectedArtifacts);
    session.artifacts = artifacts;
    session.artifactContents = Object.fromEntries(
      artifacts.map((artifact) => [artifact.id, artifact.content ?? ""]),
    );

    if (!isTerminalRunStatus(session.status)) {
      finalizeSession(
        session,
        mapSnapshotStatus(snapshot.status),
        session.latestMessage ?? "Run completed.",
      );
    }
  } catch (error) {
    if (!isTerminalRunStatus(session.status)) {
      finalizeSession(session, "failed", sanitizeErrorMessage(error));
    }
  }
}

function createExecutorForSession(session) {
  if (session.executorChoice === "mock") {
    return new MockWorkflowExecutor({
      ids: session.ids,
      clock: session.clock,
    });
  }

  return createCodeExecutorForChoice(session.executorChoice, createExecutorRuntime(), {
    ids: session.ids,
    clock: session.clock,
  });
}

function appendKernelEvent(session, event) {
  if (isTerminalRunStatus(session.status)) return;

  switch (event.type) {
    case "run.stream":
      session.stream.push(event.chunk);
      session.latestMessage = event.chunk;
      break;
    case "approval.requested":
      session.status = "awaiting-approval";
      session.pendingApproval = {
        approvalId: event.approvalId,
        category: "shell-command",
        riskLevel: "high",
        reason: "Executor requested approval during the run.",
        requestedAction: "Runtime executor approval request.",
        stage: "runtime",
      };
      appStore.createApproval({
        id: event.approvalId,
        runId: session.runId,
        workspaceId: session.workspaceId,
        executorChoice: session.executorChoice,
        category: session.pendingApproval.category,
        riskLevel: session.pendingApproval.riskLevel,
        reason: session.pendingApproval.reason,
        requestedAction: session.pendingApproval.requestedAction,
        status: "pending",
      });
      appStore.updateRunStatus(session.runId, "awaiting-approval");
      break;
    case "run.completed":
      session.latestMessage = event.message ?? session.latestMessage ?? "Run completed.";
      break;
    case "run.failed":
    case "run.interrupted":
      session.latestMessage = event.message ?? event.type;
      break;
  }

  appendLiveEvent(session, {
    type: event.type,
    message: summarizeKernelEvent(event),
    ...(event.type === "approval.requested" ? { approvalId: event.approvalId } : {}),
  });
}

function appendLiveEvent(session, event) {
  const liveEvent = {
    id: randomUUID(),
    runId: session.runId,
    type: event.type,
    message: event.message,
    createdAt: session.clock.now(),
    ...(event.approvalId ? { approvalId: event.approvalId } : {}),
  };

  session.events.push(liveEvent);
  appStore.addRunEvent({
    runId: session.runId,
    type: event.type,
    message: event.message,
    createdAt: liveEvent.createdAt,
  });
}

async function persistSessionArtifacts(session, collectedArtifacts) {
  const persisted = [];
  const artifacts = [...collectedArtifacts];

  if (artifacts.length === 0) {
    artifacts.push(createTranscriptArtifact(session));
  }

  const diffArtifact = createWorkspaceDiffArtifact(session);
  if (diffArtifact) {
    artifacts.push(diffArtifact);
  }

  for (const artifact of artifacts) {
    const saved = appStore.createArtifact({
      title: artifact.title,
      kind: artifact.kind,
      content: artifact.content ?? "",
      path: artifact.path,
      workspaceId: session.workspaceId,
      threadId: session.threadId,
      runId: session.runId,
      source: "run",
    });
    persisted.push(saved);
    appendLiveEvent(session, {
      type: "artifact.created",
      message: `Saved artifact: ${saved.title}`,
    });
  }

  return persisted;
}

function createTranscriptArtifact(session) {
  return {
    id: session.ids.artifactId(),
    kind: "markdown",
    title: "Executor Transcript",
    content: [
      "# Executor Transcript",
      "",
      `Goal: ${session.goal}`,
      "",
      "Output:",
      ...(session.stream.length > 0 ? session.stream.map((line) => `- ${line}`) : ["- No output emitted."]),
    ].join("\n"),
  };
}

function createWorkspaceDiffArtifact(session) {
  try {
    const status = execFileSync("git", ["-C", session.workspacePath, "status", "--short"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const diffStat = execFileSync("git", ["-C", session.workspacePath, "diff", "--stat"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (!status && !diffStat) return undefined;

    return {
      id: session.ids.artifactId(),
      kind: "diff",
      title: "Workspace Diff Summary",
      content: [
        "# Workspace Diff Summary",
        "",
        diffStat ? "## Diff Stat" : "",
        diffStat,
        status ? "## Git Status" : "",
        status,
      ].filter(Boolean).join("\n\n"),
    };
  } catch {
    return undefined;
  }
}

function finalizeSession(session, status, message) {
  session.status = status;
  session.completedAt = session.clock.now();
  if (message) {
    session.latestMessage = message;
  }
  if (!isTerminalRunStatus(status)) return;

  const lastEventType = session.events.at(-1)?.type;
  if (status === "failed" && lastEventType !== "run.failed") {
    appendLiveEvent(session, { type: "run.failed", message: message ?? "Run failed." });
  } else if (status === "interrupted" && lastEventType !== "run.interrupted") {
    appendLiveEvent(session, { type: "run.interrupted", message: message ?? "Run interrupted." });
  }
  appStore.updateRunStatus(session.runId, status, session.completedAt);
}

function serializeRunSession(session) {
  return {
    runId: session.runId,
    goal: session.goal,
    executorChoice: session.executorChoice,
    status: session.status,
    stream: [...session.stream],
    events: [...session.events],
    artifacts: [...session.artifacts],
    artifactContents: { ...session.artifactContents },
    ...(session.pendingApproval ? { pendingApproval: { ...session.pendingApproval } } : {}),
    ...(session.completedAt ? { completedAt: session.completedAt } : {}),
    ...(session.timeoutMs !== undefined ? { timeoutMs: session.timeoutMs } : {}),
  };
}

function requireRunSession(runId) {
  const session = runSessions.get(runId);
  if (!session) throw new Error("Run session not found.");
  return session;
}

async function requireRunnableWorkspace() {
  const workspaceId = appStore.getSetting("activeWorkspaceId");
  if (!workspaceId) throw new Error("Select a workspace before running an executor task.");

  const workspace = appStore.getWorkspace(workspaceId);
  if (!workspace) throw new Error("Active workspace was not found.");
  if (!workspace.path) throw new Error("Selected workspace does not have a local path.");

  const details = await stat(workspace.path).catch(() => undefined);
  if (!details?.isDirectory()) {
    throw new Error("Selected workspace path does not exist or is not a directory.");
  }

  return workspace;
}

function summarizeKernelEvent(event) {
  switch (event.type) {
    case "run.started":
      return `Run ${event.runId} started.`;
    case "run.stream":
      return event.chunk;
    case "approval.requested":
      return `Approval ${event.approvalId} requested.`;
    case "approval.granted":
    case "approval.rejected":
      return `Approval ${event.approvalId} resolved.`;
    case "artifact.created":
      return `Artifact ${event.artifactId} created.`;
    case "run.completed":
      return event.message ?? "Run completed.";
    case "run.failed":
    case "run.interrupted":
      return event.message ?? event.type;
    case "mission.created":
      return `Mission ${event.missionId} created.`;
    case "executor.status_changed":
      return event.message ?? `Executor available: ${event.available}`;
  }
}

function mapSnapshotStatus(status) {
  switch (status) {
    case "awaiting-approval":
      return "awaiting-approval";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "interrupted":
      return "interrupted";
    case "running":
      return "running";
  }
}

function isTerminalRunStatus(status) {
  return status === "completed" || status === "failed" || status === "interrupted";
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

function isRunLivePath(pathname) {
  return /^\/api\/runs\/[^/]+\/live$/.test(pathname);
}

function isRunCancelPath(pathname) {
  return /^\/api\/runs\/[^/]+\/cancel$/.test(pathname);
}

function isRunApprovalPath(pathname) {
  return /^\/api\/runs\/[^/]+\/approval$/.test(pathname);
}

function runIdFromPath(pathname) {
  return decodeURIComponent(pathname.split("/")[3] ?? "");
}

function isAutomationPath(pathname) {
  return /^\/api\/automations\/[^/]+$/.test(pathname);
}

function automationIdFromPath(pathname) {
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

function readOptionalPositiveNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("timeoutMs must be a positive number.");
  }
  return value;
}

function readOptionalDateString(value) {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const trimmed = value.trim();
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) throw new Error("Date value must be parseable.");
  return date.toISOString();
}

function readAutomationKind(value) {
  switch (value) {
    case "one-off":
    case "scheduled":
    case "heartbeat":
      return value;
    default:
      throw new Error("Unsupported automation kind.");
  }
}

function readOptionalAutomationStatus(value) {
  if (value === undefined) return undefined;
  switch (value) {
    case "active":
    case "paused":
      return value;
    default:
      throw new Error("Unsupported automation status.");
  }
}

function defaultAutomationIntervalMs(kind) {
  return kind === "heartbeat" ? 30_000 : 60_000;
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
        trust_level TEXT NOT NULL DEFAULT 'strict',
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
      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        workspace_id TEXT,
        executor_choice TEXT NOT NULL,
        category TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        reason TEXT NOT NULL,
        requested_action TEXT NOT NULL,
        status TEXT NOT NULL,
        decision TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        note TEXT
      );
      CREATE TABLE IF NOT EXISTS automations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        kind TEXT NOT NULL,
        prompt TEXT NOT NULL,
        status TEXT NOT NULL,
        workspace_id TEXT,
        interval_ms INTEGER,
        next_run_at TEXT,
        last_run_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS automation_runs (
        id TEXT PRIMARY KEY,
        automation_id TEXT NOT NULL,
        workspace_id TEXT,
        status TEXT NOT NULL,
        result TEXT,
        artifact_id TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT
      );
    `);
    this.addColumnIfMissing("threads", "workspace_id", "TEXT");
    this.addColumnIfMissing("workspaces", "trust_level", "TEXT NOT NULL DEFAULT 'strict'");
    this.addColumnIfMissing("approvals", "executor_choice", "TEXT NOT NULL DEFAULT 'mock'");
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
      INSERT INTO workspaces (id, name, path, trust_level, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, input.name, input.path ?? null, input.trustLevel ?? "strict", timestamp, timestamp);
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
      SET name = ?, path = COALESCE(?, path), trust_level = ?, updated_at = ?
      WHERE id = ?
    `).run(input.name ?? current.name, input.path ?? null, input.trustLevel ?? current.trustLevel ?? "strict", nowIso(), id);
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

  createRunRecord(input) {
    this.db.prepare(`
      INSERT INTO runs (id, goal, executor_choice, status, workspace_id, thread_id, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.goal,
      input.executorChoice,
      input.status,
      input.workspaceId ?? null,
      input.threadId ?? null,
      input.startedAt ?? nowIso(),
      input.completedAt ?? null,
    );
    return this.getRun(input.id);
  }

  updateRunStatus(id, status, completedAt) {
    this.db.prepare(`
      UPDATE runs
      SET status = ?, completed_at = ?, started_at = COALESCE(started_at, ?)
      WHERE id = ?
    `).run(status, completedAt ?? null, nowIso(), id);
    return this.getRun(id);
  }

  addRunEvent(input) {
    const createdAt = input.createdAt ?? nowIso();
    this.db.prepare(`
      INSERT INTO run_events (id, run_id, type, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), input.runId, input.type, input.message, createdAt);
  }

  createApproval(input) {
    const createdAt = input.createdAt ?? nowIso();
    this.db.prepare(`
      INSERT INTO approvals (
        id, run_id, workspace_id, executor_choice, category, risk_level, reason,
        requested_action, status, decision, created_at, resolved_at, note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.runId,
      input.workspaceId ?? null,
      input.executorChoice,
      input.category,
      input.riskLevel,
      input.reason,
      input.requestedAction,
      input.status,
      input.decision ?? null,
      createdAt,
      input.resolvedAt ?? null,
      input.note ?? null,
    );
    return this.getApproval(input.id);
  }

  resolveApproval(id, input) {
    const resolvedAt = input.resolvedAt ?? nowIso();
    this.db.prepare(`
      UPDATE approvals
      SET status = ?, decision = ?, resolved_at = ?, note = ?
      WHERE id = ?
    `).run(input.status, input.decision ?? null, resolvedAt, input.note ?? null, id);
    return this.getApproval(id);
  }

  getApproval(id) {
    const row = this.db.prepare("SELECT * FROM approvals WHERE id = ?").get(id);
    return row ? approvalRowToSummary(row) : undefined;
  }

  listApprovals(workspaceId) {
    const rows = workspaceId
      ? this.db.prepare("SELECT * FROM approvals WHERE workspace_id = ? ORDER BY created_at DESC").all(workspaceId)
      : this.db.prepare("SELECT * FROM approvals ORDER BY created_at DESC").all();
    return { approvals: rows.map(approvalRowToSummary) };
  }

  createAutomation(input) {
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO automations (
        id, title, kind, prompt, status, workspace_id, interval_ms, next_run_at, last_run_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.title,
      input.kind,
      input.prompt,
      "active",
      input.workspaceId ?? null,
      input.intervalMs ?? null,
      input.nextRunAt ?? timestamp,
      null,
      timestamp,
      timestamp,
    );
    return this.getAutomation(id);
  }

  updateAutomation(id, input) {
    const current = this.getAutomation(id);
    if (!current) throw new Error("Automation not found.");
    this.db.prepare(`
      UPDATE automations
      SET title = ?, prompt = ?, status = ?, interval_ms = ?, next_run_at = COALESCE(?, next_run_at), updated_at = ?
      WHERE id = ?
    `).run(
      input.title ?? current.title,
      input.prompt ?? current.prompt,
      input.status ?? current.status,
      input.intervalMs ?? current.intervalMs ?? null,
      input.nextRunAt ?? null,
      nowIso(),
      id,
    );
    return this.getAutomation(id);
  }

  deleteAutomation(id) {
    this.db.prepare("DELETE FROM automations WHERE id = ?").run(id);
  }

  getAutomation(id) {
    const row = this.db.prepare("SELECT * FROM automations WHERE id = ?").get(id);
    return row ? automationRowToSummary(row) : undefined;
  }

  listAutomations(workspaceId) {
    const rows = workspaceId
      ? this.db.prepare("SELECT * FROM automations WHERE workspace_id = ? ORDER BY updated_at DESC").all(workspaceId)
      : this.db.prepare("SELECT * FROM automations ORDER BY updated_at DESC").all();
    return { automations: rows.map(automationRowToSummary) };
  }

  listDueAutomations(now) {
    return this.db.prepare(`
      SELECT * FROM automations
      WHERE status = 'active'
        AND next_run_at IS NOT NULL
        AND next_run_at <= ?
      ORDER BY next_run_at ASC
      LIMIT 10
    `).all(now).map(automationRowToSummary);
  }

  scheduleNextAutomation(automation, runStatus) {
    const timestamp = nowIso();
    let nextRunAt = null;
    let status = automation.status;

    if (automation.kind === "one-off") {
      status = "paused";
    } else if (runStatus === "waiting-approval") {
      status = "paused";
    } else {
      nextRunAt = new Date(Date.now() + (automation.intervalMs ?? defaultAutomationIntervalMs(automation.kind))).toISOString();
    }

    this.db.prepare(`
      UPDATE automations
      SET status = ?, next_run_at = ?, last_run_at = ?, updated_at = ?
      WHERE id = ?
    `).run(status, nextRunAt, timestamp, timestamp, automation.id);
    return this.getAutomation(automation.id);
  }

  createAutomationRun(input) {
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO automation_runs (
        id, automation_id, workspace_id, status, result, artifact_id, started_at, completed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.automationId,
      input.workspaceId ?? null,
      input.status,
      input.result ?? null,
      input.artifactId ?? null,
      input.startedAt ?? nowIso(),
      input.completedAt ?? null,
    );
    return this.getAutomationRun(id);
  }

  updateAutomationRun(id, input) {
    this.db.prepare(`
      UPDATE automation_runs
      SET status = ?, result = COALESCE(?, result), artifact_id = COALESCE(?, artifact_id), completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `).run(input.status, input.result ?? null, input.artifactId ?? null, input.completedAt ?? null, id);
    return this.getAutomationRun(id);
  }

  getAutomationRun(id) {
    const row = this.db.prepare("SELECT * FROM automation_runs WHERE id = ?").get(id);
    return row ? automationRunRowToSummary(row) : undefined;
  }

  listAutomationRuns(workspaceId) {
    const rows = workspaceId
      ? this.db.prepare("SELECT * FROM automation_runs WHERE workspace_id = ? ORDER BY started_at DESC").all(workspaceId)
      : this.db.prepare("SELECT * FROM automation_runs ORDER BY started_at DESC").all();
    return { runs: rows.map(automationRunRowToSummary) };
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
    trustLevel: row.trust_level ?? "strict",
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

function approvalRowToSummary(row) {
  return {
    approvalId: row.id,
    runId: row.run_id,
    ...(row.workspace_id ? { workspaceId: row.workspace_id } : {}),
    executorChoice: row.executor_choice,
    category: row.category,
    riskLevel: row.risk_level,
    reason: row.reason,
    requestedAction: row.requested_action,
    status: row.status,
    ...(row.decision ? { decision: row.decision } : {}),
    requestedAt: row.created_at,
    ...(row.resolved_at ? { resolvedAt: row.resolved_at } : {}),
    ...(row.note ? { note: row.note } : {}),
  };
}

function automationRowToSummary(row) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    prompt: row.prompt,
    status: row.status,
    ...(row.workspace_id ? { workspaceId: row.workspace_id } : {}),
    ...(row.interval_ms !== null && row.interval_ms !== undefined ? { intervalMs: Number(row.interval_ms) } : {}),
    ...(row.next_run_at ? { nextRunAt: row.next_run_at } : {}),
    ...(row.last_run_at ? { lastRunAt: row.last_run_at } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function automationRunRowToSummary(row) {
  return {
    id: row.id,
    automationId: row.automation_id,
    ...(row.workspace_id ? { workspaceId: row.workspace_id } : {}),
    status: row.status,
    ...(row.result ? { result: row.result } : {}),
    ...(row.artifact_id ? { artifactId: row.artifact_id } : {}),
    startedAt: row.started_at,
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
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

class MockWorkflowExecutor {
  constructor(options) {
    this.options = options;
    this.id = "executor-live-mock";
    this.kind = "codex";
    this.artifactsByRun = new Map();
    this.runControls = new Map();
  }

  async getRuntimeStatus() {
    return {
      executorId: this.id,
      type: "code",
      available: true,
      message: "Deterministic workflow mock executor.",
    };
  }

  async startRun(task) {
    const now = this.options.clock.now();
    const run = {
      id: this.options.ids.runId(),
      createdAt: now,
      updatedAt: now,
      missionId: task.missionId,
      workspaceId: task.workspaceId,
      executorId: this.id,
      status: "running",
      artifactIds: [],
    };
    const artifacts = createMockWorkflowArtifacts({
      ids: this.options.ids,
      clock: this.options.clock,
      goal: task.prompt,
      runId: run.id,
      spaceId: task.spaceId,
      workspacePath: typeof task.context?.cwd === "string" ? task.context.cwd : undefined,
    });
    const control = {
      aborted: false,
      approval: undefined,
    };

    this.artifactsByRun.set(run.id, artifacts);
    this.runControls.set(run.id, control);

    return {
      run,
      events: this.streamRunEvents(run, task, control, artifacts),
    };
  }

  async submitApproval(runId, decision) {
    const control = this.runControls.get(runId);
    if (!control?.approval) return;
    control.approval.resolve(decision.decision);
  }

  async interruptRun(runId) {
    const control = this.runControls.get(runId);
    if (!control) return;
    control.aborted = true;
    control.approval?.resolve("reject");
  }

  async collectArtifacts(runId) {
    return this.artifactsByRun.get(runId) ?? [];
  }

  async *streamRunEvents(run, task, control, artifacts) {
    const eventAt = () => this.options.clock.now();
    const nextEventId = () => this.options.ids.eventId();
    const requiresApproval = promptNeedsApproval(task.prompt);

    yield {
      id: nextEventId(),
      type: "run.started",
      occurredAt: eventAt(),
      spaceId: task.spaceId,
      missionId: task.missionId,
      runId: run.id,
      executorId: this.id,
    };
    await delay(120);
    if (control.aborted) {
      yield createInterruptedEvent(nextEventId(), eventAt(), task.spaceId, run.id, "Mock run interrupted.");
      return;
    }

    yield {
      id: nextEventId(),
      type: "run.stream",
      occurredAt: eventAt(),
      spaceId: task.spaceId,
      runId: run.id,
      chunk: `Mock executor attached to ${typeof task.context?.cwd === "string" ? task.context.cwd : "workspace"}.`,
    };
    await delay(120);

    if (requiresApproval) {
      const approvalId = `approval-${randomUUID()}`;
      const approval = createDeferred();
      control.approval = { approvalId, ...approval };
      yield {
        id: nextEventId(),
        type: "approval.requested",
        occurredAt: eventAt(),
        spaceId: task.spaceId,
        runId: run.id,
        approvalId,
      };
      const decision = await approval.promise;
      control.approval = undefined;

      if (control.aborted) {
        yield createInterruptedEvent(nextEventId(), eventAt(), task.spaceId, run.id, "Mock run interrupted.");
        return;
      }

      if (decision === "reject") {
        yield {
          id: nextEventId(),
          type: "run.failed",
          occurredAt: eventAt(),
          spaceId: task.spaceId,
          runId: run.id,
          message: "Approval rejected.",
        };
        return;
      }

      yield {
        id: nextEventId(),
        type: "run.stream",
        occurredAt: eventAt(),
        spaceId: task.spaceId,
        runId: run.id,
        chunk: "Approval granted. Continuing mock workflow.",
      };
      await delay(120);
    }

    if (control.aborted) {
      yield createInterruptedEvent(nextEventId(), eventAt(), task.spaceId, run.id, "Mock run interrupted.");
      return;
    }

    yield {
      id: nextEventId(),
      type: "run.stream",
      occurredAt: eventAt(),
      spaceId: task.spaceId,
      runId: run.id,
      chunk: "Mock executor prepared artifact previews.",
    };
    await delay(120);

    for (const artifact of artifacts) {
      yield {
        id: nextEventId(),
        type: "artifact.created",
        occurredAt: eventAt(),
        spaceId: task.spaceId,
        runId: run.id,
        artifactId: artifact.id,
      };
    }

    yield {
      id: nextEventId(),
      type: "run.completed",
      occurredAt: eventAt(),
      spaceId: task.spaceId,
      runId: run.id,
      message: "Mock workflow completed.",
    };
  }
}

function createMockWorkflowArtifacts(input) {
  const now = input.clock.now();
  const workspacePath = input.workspacePath ?? "(no workspace path)";

  return [
    {
      id: input.ids.artifactId(),
      createdAt: now,
      updatedAt: now,
      spaceId: input.spaceId,
      runId: input.runId,
      kind: "report",
      title: "Mock Run Report",
      content: [
        "# Mock Run Report",
        "",
        `Goal: ${input.goal}`,
        `Workspace: ${workspacePath}`,
        "",
        "- Workspace context loaded.",
        "- Approval flow supported when requested.",
        "- Artifact previews generated.",
      ].join("\n"),
    },
    {
      id: input.ids.artifactId(),
      createdAt: now,
      updatedAt: now,
      spaceId: input.spaceId,
      runId: input.runId,
      kind: "diff",
      title: "Mock Workspace Diff",
      content: [
        "diff --git a/mock.txt b/mock.txt",
        "--- a/mock.txt",
        "+++ b/mock.txt",
        "@@ -0,0 +1,2 @@",
        `+Goal: ${input.goal}`,
        `+Workspace: ${workspacePath}`,
      ].join("\n"),
    },
  ];
}

function createWorkflowIds() {
  const runId = `run-live-${randomUUID()}`;
  const missionId = `mission-live-${randomUUID()}`;

  return {
    missionId: () => missionId,
    runId: () => runId,
    artifactId: () => `artifact-live-${randomUUID()}`,
    eventId: () => `event-live-${randomUUID()}`,
  };
}

function createWorkflowClock() {
  return {
    now: () => nowIso(),
  };
}

function createDeferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function promptNeedsApproval(prompt) {
  return /\b(runtime approval|pause for approval)\b/i.test(prompt);
}

function createInterruptedEvent(id, occurredAt, spaceId, runId, message) {
  return {
    id,
    type: "run.interrupted",
    occurredAt,
    spaceId,
    runId,
    message,
  };
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
    let interrupted = command.signal?.aborted === true;
    let lastStdoutLine = "";
    const timeoutMs = command.timeoutMs ?? this.timeoutMs;
    const interrupt = () => {
      interrupted = true;
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
      }
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      interrupt();
    }, timeoutMs);
    const spawnError = new Promise((_, reject) => child.once("error", reject));
    let stderr = "";
    const abortListener = () => {
      interrupt();
    };

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    command.signal?.addEventListener("abort", abortListener, { once: true });
    child.stdin.end(command.input ?? "");

    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    for await (const line of lines) {
      lastStdoutLine = line;
      yield line;
    }

    const [code] = await Promise.race([once(child, "close"), spawnError]).finally(() => {
      clearTimeout(timeout);
      command.signal?.removeEventListener("abort", abortListener);
    });
    if (timedOut) {
      throw new Error(`${command.command} exceeded ${timeoutMs}ms demo timeout.${summarizeProcessOutput(lastStdoutLine)}`);
    }
    if (interrupted) throw createAbortError(`${command.command} interrupted.`);
    if (code !== 0) throw new Error(stderr.trim() || `${command.command} exited with code ${code}`);
  }
}

function createAbortError(message) {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
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
automationInterval = setInterval(() => {
  void runDueAutomations().catch((error) => {
    process.stderr.write(`Automation tick failed: ${sanitizeErrorMessage(error)}\n`);
  });
}, automationTickMs);

const server = createServer(async (request, response) => {
  try {
    await handleRequest(request, response);
  } catch (error) {
    const status = error instanceof NotFoundError ? 404 : 500;
    response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
    response.end(status === 404 ? "Not found" : sanitizeErrorMessage(error));
  }
});

server.on("close", () => {
  if (automationInterval) clearInterval(automationInterval);
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`AI Space Demo: http://127.0.0.1:${port}\n`);
});
