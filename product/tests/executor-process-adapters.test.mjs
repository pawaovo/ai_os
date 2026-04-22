import test from "node:test";
import assert from "node:assert/strict";

import { CodexProcessExecutor } from "../packages/executors/executor-codex/dist/index.js";
import { ClaudeCodeProcessExecutor } from "../packages/executors/executor-claude-code/dist/index.js";

const now = "2026-04-18T00:00:00.000Z";

function createRunner(lines) {
  const calls = {
    isAvailable: [],
    run: [],
  };

  return {
    calls,
    async isAvailable(command) {
      calls.isAvailable.push(command);
      return true;
    },
    run(command) {
      calls.run.push(command);
      return (async function* () {
        for (const line of lines) yield line;
      })();
    },
  };
}

const ids = {
  runId: () => "run-test",
  eventId: () => "event-test",
};

const clock = {
  now: () => now,
};

const task = {
  missionId: "mission-test",
  spaceId: "space-test",
  workspaceId: "workspace-test",
  prompt: "Analyze the project",
  context: {
    cwd: "/tmp/project",
  },
};

test("CodexProcessExecutor streams normalized kernel events from process lines", async () => {
  const runner = createRunner([
    "not json",
    '{"type":"thread.started"}',
    '{"type":"item.agentMessage.delta"}',
    '{"type":"item.agentMessage.delta","delta":"hello"}',
    '{"type":"turn.completed","message":"done"}',
  ]);
  const executor = CodexProcessExecutor.create({
    id: "executor-test",
    runner,
    ids,
    clock,
  });

  const codexStatus = await executor.getRuntimeStatus();
  assert.equal(codexStatus.executorId, "executor-test");
  assert.equal(codexStatus.type, "code");
  assert.equal(codexStatus.available, true);
  assert.equal(codexStatus.compatibility.transport, "process-cli");
  assert.equal(codexStatus.compatibility.capabilities.approvalBridge, "product-pre-run");
  assert.equal(codexStatus.compatibility.capabilities.artifactCollection, "fallback-only");
  assert.equal(codexStatus.compatibility.capabilities.sessionContinuation, "product-pre-run");

  const result = await executor.startRun(task);
  const events = [];
  for await (const event of result.events) events.push(event);

  assert.equal(result.run.id, "run-test");
  const { signal: codexSignal, ...codexCommand } = runner.calls.run[0];
  assert.equal(codexSignal instanceof AbortSignal, true);
  assert.deepEqual(codexCommand, {
    command: "codex",
    args: ["exec", "--json", "Analyze the project"],
    cwd: "/tmp/project",
  });
  assert.deepEqual(events.map((event) => event.type), ["run.started", "run.stream", "run.completed"]);
  assert.deepEqual(events.map((event) => event.spaceId), ["space-test", "space-test", "space-test"]);
});

test("CodexProcessExecutor accepts Codex exec JSONL output shape", async () => {
  const runner = createRunner([
    "2026-04-18T09:50:45Z WARN non-json warning",
    '{"type":"thread.started","thread_id":"thread-test"}',
    '{"type":"turn.started"}',
    '{"type":"item.completed","item":{"id":"item-1","type":"agent_message","text":"OK"}}',
    '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
  ]);
  const executor = CodexProcessExecutor.create({
    id: "executor-test",
    runner,
    ids,
    clock,
  });

  const result = await executor.startRun(task);
  const events = [];
  for await (const event of result.events) events.push(event);

  assert.deepEqual(events.map((event) => event.type), ["run.started", "run.stream", "run.completed"]);
  assert.deepEqual(events.map((event) => event.spaceId), ["space-test", "space-test", "space-test"]);
  assert.equal(events[1].chunk, "OK");
});

test("ClaudeCodeProcessExecutor streams normalized kernel events from process lines", async () => {
  const runner = createRunner([
    "not json",
    '{"type":"session.started"}',
    '{"type":"assistant.delta"}',
    '{"type":"assistant.delta","text":"hello"}',
    '{"type":"session.completed","message":"done"}',
  ]);
  const executor = ClaudeCodeProcessExecutor.create({
    id: "executor-test",
    runner,
    ids,
    clock,
  });

  const claudeStatus = await executor.getRuntimeStatus();
  assert.equal(claudeStatus.executorId, "executor-test");
  assert.equal(claudeStatus.type, "code");
  assert.equal(claudeStatus.available, true);
  assert.equal(claudeStatus.compatibility.transport, "process-cli");
  assert.equal(claudeStatus.compatibility.capabilities.approvalBridge, "product-pre-run");
  assert.equal(claudeStatus.compatibility.capabilities.artifactCollection, "fallback-only");

  const result = await executor.startRun(task);
  const events = [];
  for await (const event of result.events) events.push(event);

  assert.equal(result.run.id, "run-test");
  const { signal: claudeSignal, ...claudeCommand } = runner.calls.run[0];
  assert.equal(claudeSignal instanceof AbortSignal, true);
  assert.deepEqual(claudeCommand, {
    command: "claude",
    args: [
      "-p",
      "--verbose",
      "--output-format",
      "stream-json",
      "--no-session-persistence",
      "Analyze the project",
    ],
    cwd: "/tmp/project",
  });
  assert.deepEqual(events.map((event) => event.type), ["run.started", "run.stream", "run.completed"]);
  assert.deepEqual(events.map((event) => event.spaceId), ["space-test", "space-test", "space-test"]);
});

test("ClaudeCodeProcessExecutor accepts Claude Code stream-json output shape", async () => {
  const runner = createRunner([
    '{"type":"system","subtype":"hook_started"}',
    '{"type":"system","subtype":"init"}',
    '{"type":"assistant","message":{"content":[{"type":"text","text":"OK"}]}}',
    '{"type":"result","subtype":"success","is_error":false,"result":"done"}',
  ]);
  const executor = ClaudeCodeProcessExecutor.create({
    id: "executor-test",
    runner,
    ids,
    clock,
  });

  const result = await executor.startRun(task);
  const events = [];
  for await (const event of result.events) events.push(event);

  assert.deepEqual(events.map((event) => event.type), ["run.started", "run.stream", "run.completed"]);
  assert.deepEqual(events.map((event) => event.spaceId), ["space-test", "space-test", "space-test"]);
  assert.equal(events[1].chunk, "OK");
});
