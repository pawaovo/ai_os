import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const productRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

execFileSync(
  process.execPath,
  ["./node_modules/typescript/bin/tsc", "-b", "apps/space-desktop/tsconfig.json"],
  { cwd: productRoot },
);

const { createSpaceDesktopShellModel } = await import("../apps/space-desktop/dist/index.js");
const {
  createInitialSpaceDemoState,
  createRunningSpaceDemoState,
  runSpaceDemoGoal,
} = await import("../apps/space-desktop/dist/demo-runtime.js");
const {
  createProviderSettingsResponse,
  parseChatSendRequest,
  parseProviderSettingsInput,
  parseSpaceDemoRunRequest,
  runChatSendRequest,
  runSpaceDemoRequest,
} = await import("../apps/space-desktop/dist/server-runtime.js");

test("createSpaceDesktopShellModel returns the default minimal shell", () => {
  const model = createSpaceDesktopShellModel();

  assert.equal(model.appId, "space-desktop");
  assert.equal(model.title, "AI Space Desktop");
  assert.deepEqual(
    model.sections.map((section) => section.kind),
    ["chat", "run-status", "artifact-list"],
  );

  assert.deepEqual(model.sections[0], {
    kind: "chat",
    title: "Chat",
    transcriptPreview: [],
    composerPlaceholder: "Ask AI Space to help with your workspace.",
    emptyState: "No conversation loaded yet.",
  });

  assert.deepEqual(model.sections[1], {
    kind: "run-status",
    title: "Run Status",
    status: "queued",
    summary: "No run started.",
  });

  assert.deepEqual(model.sections[2], {
    kind: "artifact-list",
    title: "Artifacts",
    items: [],
    emptyState: "Run outputs will appear here.",
  });
});

test("createSpaceDesktopShellModel applies custom run and artifact state", () => {
  const transcriptPreview = ["User: summarize the repo", "Assistant: working on it"];
  const artifacts = [
    {
      id: "artifact-report",
      kind: "report",
      title: "Session report",
      path: "/tmp/session-report.md",
    },
    {
      id: "artifact-diff",
      kind: "diff",
      title: "Workspace diff",
    },
  ];

  const model = createSpaceDesktopShellModel({
    title: "Mission Shell",
    threadId: "thread-test",
    transcriptPreview,
    runStatus: "awaiting-approval",
    runStatusSummary: "Waiting for human approval.",
    artifacts,
  });

  transcriptPreview.push("Mutation after model creation");
  artifacts[0].title = "Mutated title";

  assert.equal(model.title, "Mission Shell");
  assert.deepEqual(model.sections[0], {
    kind: "chat",
    title: "Chat",
    threadId: "thread-test",
    transcriptPreview: ["User: summarize the repo", "Assistant: working on it"],
    composerPlaceholder: "Ask AI Space to help with your workspace.",
    emptyState: "Recent conversation is ready.",
  });

  assert.deepEqual(model.sections[1], {
    kind: "run-status",
    title: "Run Status",
    status: "awaiting-approval",
    summary: "Waiting for human approval.",
  });

  assert.deepEqual(model.sections[2], {
    kind: "artifact-list",
    title: "Artifacts",
    items: [
      {
        id: "artifact-report",
        kind: "report",
        title: "Session report",
        path: "/tmp/session-report.md",
      },
      {
        id: "artifact-diff",
        kind: "diff",
        title: "Workspace diff",
      },
    ],
    emptyState: "2 artifacts ready.",
  });
});

test("createInitialSpaceDemoState exposes the visible local demo shell", () => {
  const state = createInitialSpaceDemoState();

  assert.equal(state.phase, "idle");
  assert.equal(state.executorChoice, "mock");
  assert.equal(state.shell.title, "AI Space Demo");
  assert.equal(state.shell.sections[1].status, "queued");
  assert.deepEqual(state.artifacts, []);
  assert.equal(state.events[0].type, "space.ready");
});

test("space desktop V0.3 page exposes a structured workspace workbench", async () => {
  const html = await readFile(resolve(productRoot, "apps/space-desktop/public/index.html"), "utf8");
  const styles = await readFile(resolve(productRoot, "apps/space-desktop/public/styles.css"), "utf8");

  assert.match(html, /data-layout="v0\.3-workbench"/);
  assert.match(html, /id="workspace-select"/);
  assert.match(html, /id="active-workspace-label"/);
  assert.match(html, /id="run-history-list"/);
  assert.match(html, /id="artifact-select"/);
  assert.match(html, /id="run-artifact-preview"/);
  assert.match(styles, /\.space-workbench/);
  assert.match(styles, /\.left-rail/);
  assert.match(styles, /\.center-stage/);
  assert.match(styles, /\.right-rail/);
});

test("createRunningSpaceDemoState shows an in-progress mission before completion", () => {
  const state = createRunningSpaceDemoState({
    goal: " Summarize my workspace ",
    executorChoice: "mock",
  });

  assert.equal(state.phase, "running");
  assert.equal(state.goal, "Summarize my workspace");
  assert.equal(state.shell.sections[1].status, "running");
  assert.deepEqual(state.shell.sections[0].transcriptPreview, [
    "User: Summarize my workspace",
    "Assistant: starting the local run...",
  ]);
});

test("runSpaceDemoGoal executes the V0.1 Space loop through Companion and Control Plane", async () => {
  const result = await runSpaceDemoGoal({
    goal: "Draft a workspace organization plan",
    eventDelayMs: 0,
  });

  assert.equal(result.state.phase, "completed");
  assert.equal(result.summary.missionStatus, "completed");
  assert.equal(result.summary.runStatus, "completed");
  assert.equal(result.summary.artifactCount, 1);
  assert.equal(result.state.shell.sections[1].status, "completed");
  assert.deepEqual(
    result.state.events.map((event) => event.type),
    ["run.started", "run.stream", "run.stream", "artifact.created", "run.completed"],
  );
  assert.match(
    Object.values(result.state.artifactContents)[0],
    /Goal: Draft a workspace organization plan/,
  );
});

test("runSpaceDemoGoal keeps real executor choices visible but disabled for this demo", async () => {
  await assert.rejects(
    runSpaceDemoGoal({
      goal: "Use Codex for this demo",
      executorChoice: "codex",
      eventDelayMs: 0,
    }),
    /Direct browser runtime only supports/,
  );
});

test("parseSpaceDemoRunRequest validates the local server request shape", () => {
  assert.deepEqual(
    parseSpaceDemoRunRequest({
      goal: "Run from the server",
      executorChoice: "claude-code",
    }),
    {
      goal: "Run from the server",
      executorChoice: "claude-code",
    },
  );

  assert.throws(
    () => parseSpaceDemoRunRequest({ goal: "Bad executor", executorChoice: "browser" }),
    /Unsupported executor choice/,
  );
});

test("provider settings parsing preserves an existing API key when the form leaves it blank", () => {
  const provider = parseProviderSettingsInput(
    {
      name: "Preview Provider",
      protocol: "openai-compatible",
      baseUrl: "https://example.test/v1/",
      apiKey: "",
      modelId: "demo-model",
    },
    {
      name: "Old Provider",
      protocol: "openai-compatible",
      baseUrl: "https://old.test/v1",
      apiKey: "sk-existing-key",
      modelId: "old-model",
    },
  );

  assert.deepEqual(provider, {
    name: "Preview Provider",
    protocol: "openai-compatible",
    baseUrl: "https://example.test/v1",
    apiKey: "sk-existing-key",
    modelId: "demo-model",
  });
  assert.deepEqual(createProviderSettingsResponse(provider), {
    configured: true,
    provider: {
      name: "Preview Provider",
      protocol: "openai-compatible",
      baseUrl: "https://example.test/v1",
      apiKeyPreview: "sk-...-key",
      modelId: "demo-model",
    },
  });
});

test("parseChatSendRequest validates chat message and history shape", () => {
  assert.deepEqual(
    parseChatSendRequest({
      message: "Hello",
      history: [{ role: "assistant", content: "Hi" }],
    }),
    {
      message: "Hello",
      history: [{ role: "assistant", content: "Hi" }],
    },
  );

  assert.throws(
    () => parseChatSendRequest({ message: "Hello", history: [{ role: "tool", content: "bad" }] }),
    /Unsupported chat role/,
  );
});

test("runChatSendRequest sends OpenAI-compatible chat through the provider layer", async () => {
  const calls = [];
  const response = await runChatSendRequest({
    request: {
      message: "What can V0.1 do?",
      history: [{ role: "system", content: "Answer briefly." }],
    },
    provider: {
      name: "Preview Provider",
      protocol: "openai-compatible",
      baseUrl: "https://provider.test/v1",
      apiKey: "sk-test",
      modelId: "demo-model",
    },
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createSseResponse('data: {"choices":[{"delta":{"content":"It can chat."}}]}\n\n');
    },
  });

  assert.equal(response.assistantMessage, "It can chat.");
  assert.deepEqual(response.messages.map((message) => message.role), ["system", "user", "assistant"]);
  assert.equal(calls[0].url, "https://provider.test/v1/chat/completions");
  assert.equal(calls[0].init.headers.Authorization, "Bearer sk-test");
  assert.match(String(calls[0].init.body), /"model":"demo-model"/);
});

test("runChatSendRequest sends Anthropic-compatible chat through the provider layer", async () => {
  const calls = [];
  const response = await runChatSendRequest({
    request: {
      message: "What can V0.1 do?",
      history: [{ role: "assistant", content: "Earlier answer" }],
    },
    provider: {
      name: "Anthropic Preview",
      protocol: "anthropic-compatible",
      baseUrl: "https://anthropic.test/v1",
      apiKey: "sk-ant-test",
      modelId: "claude-demo",
    },
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createSseResponse('data: {"type":"content_block_delta","delta":{"text":"It can chat."}}\n\n');
    },
  });

  assert.equal(response.assistantMessage, "It can chat.");
  assert.equal(calls[0].url, "https://anthropic.test/v1/messages");
  assert.equal(calls[0].init.headers["x-api-key"], "sk-ant-test");
  assert.match(String(calls[0].init.body), /"model":"claude-demo"/);
});

test("space desktop dev server persists providers, threads, and messages without leaking secrets", async () => {
  const storageDir = await mkdtemp(`${tmpdir()}/ai-os-v02-`);
  const providerServer = await startMockOpenAiProvider();
  const appPort = await getAvailablePort();
  const appServer = startSpaceDesktopServer({
    port: appPort,
    storageDir,
  });
  let restartedServer;

  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const provider = await postJson(`http://127.0.0.1:${appPort}/api/providers`, {
      name: "Persistent Mock Provider",
      protocol: "openai-compatible",
      baseUrl: `http://127.0.0.1:${providerServer.port}/v1`,
      apiKey: "sk-persistent-secret",
      modelId: "mock-model",
    });

    assert.equal(provider.configured, true);
    assert.equal(provider.provider.apiKey, undefined);

    const workspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "Persistent Workspace",
      path: "/tmp/ai-os-workspace",
    });
    assert.equal(workspace.workspace.name, "Persistent Workspace");

    const thread = await postJson(`http://127.0.0.1:${appPort}/api/threads`, {
      title: "Persistent Thread",
    });
    assert.equal(thread.thread.workspaceId, workspace.workspace.id);

    const otherWorkspace = await postJson(`http://127.0.0.1:${appPort}/api/workspaces`, {
      name: "Other Workspace",
      path: "/tmp/ai-os-other-workspace",
    });
    const otherThread = await postJson(`http://127.0.0.1:${appPort}/api/threads`, {
      title: "Other Thread",
    });
    assert.equal(otherThread.thread.workspaceId, otherWorkspace.workspace.id);

    await patchJson(`http://127.0.0.1:${appPort}/api/settings/workspace-selection`, {
      workspaceId: workspace.workspace.id,
    });
    const scopedThreads = await getJson(`http://127.0.0.1:${appPort}/api/threads`);
    assert.deepEqual(scopedThreads.threads.map((item) => item.title), ["Persistent Thread"]);

    const missingWorkspace = await patchJsonAllowFailure(`http://127.0.0.1:${appPort}/api/settings/workspace-selection`, {
      workspaceId: "missing-workspace",
    });
    assert.equal(missingWorkspace.ok, false);

    await postJson(`http://127.0.0.1:${appPort}/api/threads/${thread.thread.id}/messages`, {
      message: "hello persistent server",
    });
    providerServer.mode = "fail-chat";
    const failedChat = await postJsonAllowFailure(`http://127.0.0.1:${appPort}/api/threads/${thread.thread.id}/messages`, {
      message: "this should fail with json",
    });

    assert.equal(failedChat.ok, false);
    assert.equal(typeof failedChat.payload.error, "string");

    const manualArtifact = await postJson(`http://127.0.0.1:${appPort}/api/artifacts`, {
      title: "Manual Artifact",
      content: "# Manual artifact",
      workspaceId: workspace.workspace.id,
      threadId: thread.thread.id,
      source: "manual",
    });
    assert.equal(manualArtifact.artifact.title, "Manual Artifact");

    await postJson(`http://127.0.0.1:${appPort}/api/demo/run`, {
      goal: "persist run history",
      executorChoice: "mock",
    });

    await appServer.stop();
    restartedServer = startSpaceDesktopServer({
      port: appPort,
      storageDir,
    });

    await waitForHttp(`http://127.0.0.1:${appPort}/`);

    const providers = await getJson(`http://127.0.0.1:${appPort}/api/providers`);
    assert.equal(providers.providers.length, 1);
    assert.equal(providers.providers[0].name, "Persistent Mock Provider");
    assert.equal(providers.providers[0].apiKey, undefined);

    const workspaces = await getJson(`http://127.0.0.1:${appPort}/api/workspaces`);
    assert.equal(workspaces.workspaces.length, 2);
    assert.deepEqual(
      workspaces.workspaces.map((item) => item.name).sort(),
      ["Other Workspace", "Persistent Workspace"],
    );
    assert.equal(workspaces.activeWorkspaceId, workspace.workspace.id);

    const messages = await getJson(`http://127.0.0.1:${appPort}/api/threads/${thread.thread.id}/messages`);
    assert.equal(messages.thread.title, "Persistent Thread");
    assert.equal(messages.thread.workspaceId, workspace.workspace.id);
    assert.deepEqual(
      messages.messages.map((message) => `${message.role}:${message.content}`),
      [
        "user:hello persistent server",
        "assistant:persistent chat ok",
        "user:this should fail with json",
        "system:OpenAI-compatible chat request failed with HTTP 500.",
      ],
    );

    const artifacts = await getJson(`http://127.0.0.1:${appPort}/api/artifacts`);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.title === "Manual Artifact"), true);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.source === "chat"), true);
    assert.equal(artifacts.artifacts.some((artifact) => artifact.source === "run"), true);

    const artifactDetail = await getJson(`http://127.0.0.1:${appPort}/api/artifacts/${manualArtifact.artifact.id}`);
    assert.equal(artifactDetail.artifact.content, "# Manual artifact");

    const runs = await getJson(`http://127.0.0.1:${appPort}/api/runs`);
    assert.equal(runs.runs.length, 1);
    assert.equal(runs.runs[0].goal, "persist run history");
    const runEvents = await getJson(`http://127.0.0.1:${appPort}/api/runs/${runs.runs[0].id}/events`);
    assert.equal(runEvents.events.length > 0, true);

    const dbBytes = await readFile(`${storageDir}/app.db`);
    assert.equal(dbBytes.includes(Buffer.from("sk-persistent-secret")), false);

    const secretStore = JSON.parse(await readFile(`${storageDir}/secrets.json`, "utf8"));
    assert.equal(Object.values(secretStore)[0], "sk-persistent-secret");
  } finally {
    await restartedServer?.stop();
    await appServer.stop();
    await providerServer.stop();
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("runSpaceDemoRequest executes the mock path through the server runtime", async () => {
  const response = await runSpaceDemoRequest(
    {
      goal: "Run mock through server",
      executorChoice: "mock",
    },
    {
      runner: createUnavailableRunner(),
    },
  );

  assert.equal(response.state.phase, "completed");
  assert.equal(response.state.executorChoice, "mock");
  assert.equal(response.state.artifacts.length, 1);
});

test("runSpaceDemoRequest surfaces unavailable real executors as failed state", async () => {
  const response = await runSpaceDemoRequest(
    {
      goal: "Run Codex through server",
      executorChoice: "codex",
    },
    {
      runner: createUnavailableRunner(),
    },
  );

  assert.equal(response.state.phase, "failed");
  assert.equal(response.state.executorChoice, "codex");
  assert.match(response.state.error, /Codex command not found|not available/);
});

test("runSpaceDemoRequest can normalize Codex output without launching a real CLI", async () => {
  const runner = createFakeProcessRunner([
    '{"type":"thread.started"}',
    '{"type":"item.completed","item":{"type":"agent_message","text":"Codex result"}}',
    '{"type":"turn.completed","message":"done"}',
  ]);
  const response = await runSpaceDemoRequest(
    {
      goal: "Run Codex through fake process",
      executorChoice: "codex",
    },
    {
      runner,
    },
  );

  assert.equal(response.state.phase, "completed");
  assert.equal(response.state.executorChoice, "codex");
  assert.deepEqual(
    response.state.events.map((event) => event.type),
    ["run.started", "run.stream", "run.completed"],
  );
  assert.equal(response.state.artifacts[0].title, "Executor Transcript");
  assert.match(response.state.artifactContents[response.state.artifacts[0].id], /Codex result/);
  assert.deepEqual(runner.calls[0].args.slice(0, 5), [
    "exec",
    "--json",
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
  ]);
});

test("runSpaceDemoRequest can normalize Claude Code output without launching a real CLI", async () => {
  const runner = createFakeProcessRunner([
    '{"type":"system","subtype":"init"}',
    '{"type":"assistant","message":{"content":[{"type":"text","text":"Claude result"}]}}',
    '{"type":"result","subtype":"success","is_error":false,"result":"done"}',
  ]);
  const response = await runSpaceDemoRequest(
    {
      goal: "Run Claude through fake process",
      executorChoice: "claude-code",
    },
    {
      runner,
    },
  );

  assert.equal(response.state.phase, "completed");
  assert.equal(response.state.executorChoice, "claude-code");
  assert.deepEqual(
    response.state.events.map((event) => event.type),
    ["run.started", "run.stream", "run.completed"],
  );
  assert.equal(response.state.artifacts[0].title, "Executor Transcript");
  assert.match(response.state.artifactContents[response.state.artifacts[0].id], /Claude result/);
});

function createUnavailableRunner() {
  return {
    async isAvailable() {
      return false;
    },
    async *run() {
      throw new Error("Should not run unavailable executor.");
    },
  };
}

function createFakeProcessRunner(lines) {
  const calls = [];

  return {
    calls,
    async isAvailable() {
      return true;
    },
    run(command) {
      calls.push(command);
      return (async function* () {
        for (const line of lines) yield line;
      })();
    },
  };
}

function createSseResponse(text) {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    }),
    {
      status: 200,
    },
  );
}

function startSpaceDesktopServer({ port, storageDir }) {
  const child = spawn(
    process.execPath,
    ["./apps/space-desktop/scripts/dev-server.mjs"],
    {
      cwd: productRoot,
      env: {
        ...process.env,
        PORT: String(port),
        AI_SPACE_SKIP_BUILD: "1",
        AI_SPACE_STORAGE_DIR: storageDir,
        AI_SPACE_SECRET_BACKEND: "file",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  return {
    process: child,
    async stop() {
      if (child.exitCode !== null || child.signalCode !== null) return;

      child.kill("SIGTERM");
      await new Promise((resolve) => {
        child.once("close", resolve);
        setTimeout(resolve, 1000);
      });
    },
    stderr() {
      return stderr;
    },
  };
}

async function startMockOpenAiProvider() {
  const state = {
    mode: "ok",
  };
  const server = createServer((request, response) => {
    if (request.url?.endsWith("/chat/completions")) {
      request.resume();
      if (state.mode === "fail-chat") {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "forced failure" }));
        return;
      }

      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end('data: {"choices":[{"delta":{"content":"persistent chat ok"}}]}\n\n');
      return;
    }

    if (request.url?.endsWith("/models")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "mock-model" }] }));
      return;
    }

    response.writeHead(404);
    response.end("not found");
  });
  const port = await listenOnRandomPort(server);

  return {
    port,
    get mode() {
      return state.mode;
    },
    set mode(value) {
      state.mode = value;
    },
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

async function listenOnRandomPort(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.equal(typeof address, "object");
  assert.notEqual(address, null);
  return address.port;
}

async function getAvailablePort() {
  const server = createServer();
  const port = await listenOnRandomPort(server);
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForHttp(url) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < 5000) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function getJson(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  assert.equal(response.ok, true);
  return response.json();
}

async function postJsonAllowFailure(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return {
    ok: response.ok,
    status: response.status,
    payload: await response.json(),
  };
}

async function patchJson(url, body) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  assert.equal(response.ok, true);
  return response.json();
}

async function patchJsonAllowFailure(url, body) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return {
    ok: response.ok,
    status: response.status,
    payload: await response.json(),
  };
}
