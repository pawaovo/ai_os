import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
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
  parseSpaceDemoRunRequest,
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
