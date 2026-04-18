import test from "node:test";
import assert from "node:assert/strict";

import { mapCodexEventToKernelEvent } from "../packages/executors/executor-codex/dist/index.js";
import { mapClaudeCodeEventToKernelEvent } from "../packages/executors/executor-claude-code/dist/index.js";

const context = {
  eventId: "event-test",
  occurredAt: "2026-04-18T00:00:00.000Z",
  spaceId: "space-test",
  missionId: "mission-test",
  runId: "run-test",
  executorId: "executor-test",
};

test("mapCodexEventToKernelEvent maps native-like events", () => {
  assert.deepEqual(mapCodexEventToKernelEvent({ type: "thread.started" }, context), {
    id: "event-test",
    type: "run.started",
    occurredAt: "2026-04-18T00:00:00.000Z",
    spaceId: "space-test",
    missionId: "mission-test",
    runId: "run-test",
    executorId: "executor-test",
  });

  assert.deepEqual(mapCodexEventToKernelEvent({ type: "item.agentMessage.delta", delta: "hello" }, context), {
    id: "event-test",
    type: "run.stream",
    occurredAt: "2026-04-18T00:00:00.000Z",
    spaceId: "space-test",
    runId: "run-test",
    chunk: "hello",
  });

  assert.deepEqual(
    mapCodexEventToKernelEvent({ type: "item.commandExecution.requestApproval", approvalId: "approval-test" }, context),
    {
      id: "event-test",
      type: "approval.requested",
      occurredAt: "2026-04-18T00:00:00.000Z",
      spaceId: "space-test",
      runId: "run-test",
      approvalId: "approval-test",
    },
  );
});

test("mapClaudeCodeEventToKernelEvent maps native-like events", () => {
  assert.deepEqual(mapClaudeCodeEventToKernelEvent({ type: "session.started" }, context), {
    id: "event-test",
    type: "run.started",
    occurredAt: "2026-04-18T00:00:00.000Z",
    spaceId: "space-test",
    missionId: "mission-test",
    runId: "run-test",
    executorId: "executor-test",
  });

  assert.deepEqual(mapClaudeCodeEventToKernelEvent({ type: "assistant.delta", text: "hello" }, context), {
    id: "event-test",
    type: "run.stream",
    occurredAt: "2026-04-18T00:00:00.000Z",
    spaceId: "space-test",
    runId: "run-test",
    chunk: "hello",
  });

  assert.deepEqual(mapClaudeCodeEventToKernelEvent({ type: "artifact.created", artifactId: "artifact-test" }, context), {
    id: "event-test",
    type: "artifact.created",
    occurredAt: "2026-04-18T00:00:00.000Z",
    spaceId: "space-test",
    runId: "run-test",
    artifactId: "artifact-test",
  });
});

