import test from "node:test";
import assert from "node:assert/strict";

import { ControlPlane, createRunSnapshot, reduceRunSnapshot } from "../packages/control/control-plane/dist/index.js";

const now = "2026-04-18T00:00:00.000Z";

function createMockExecutor(events) {
  const calls = {
    startRun: [],
    collectArtifacts: [],
    submitApproval: [],
  };

  return {
    calls,
    id: "executor-test",
    kind: "codex",
    async getRuntimeStatus() {
      return { executorId: "executor-test", type: "code", available: true };
    },
    async startRun(task) {
      calls.startRun.push(task);
      return {
        run: {
          id: "run-test",
          createdAt: now,
          updatedAt: now,
          missionId: task.missionId,
          workspaceId: task.workspaceId,
          executorId: "executor-test",
          status: "running",
          artifactIds: [],
        },
        events: (async function* () {
          for (const event of events) yield event;
        })(),
      };
    },
    async submitApproval(runId, decision) {
      calls.submitApproval.push({ runId, decision });
    },
    async interruptRun() {},
    async collectArtifacts() {
      calls.collectArtifacts.push("run-test");
      return [
        {
          id: "artifact-test",
          createdAt: now,
          updatedAt: now,
          spaceId: "space-test",
          runId: "run-test",
          kind: "markdown",
          title: "Result",
          content: "Done",
        },
      ];
    },
  };
}

test("ControlPlane starts a mission run through an executor", async () => {
  const executor = createMockExecutor([]);
  const controlPlane = new ControlPlane(
    { missionId: () => "mission-test" },
    { now: () => now },
  );

  const result = await controlPlane.startMissionRun({
    spaceId: "space-test",
    threadId: "thread-test",
    workspaceId: "workspace-test",
    goal: "Analyze the project",
    executor,
  });

  assert.deepEqual(result.mission, {
    id: "mission-test",
    createdAt: now,
    updatedAt: now,
    spaceId: "space-test",
    threadId: "thread-test",
    goal: "Analyze the project",
    status: "running",
    runIds: ["run-test"],
  });

  assert.equal(result.run.id, "run-test");
  assert.equal(result.run.missionId, "mission-test");
  assert.deepEqual(executor.calls.startRun, [
    {
      missionId: "mission-test",
      spaceId: "space-test",
      workspaceId: "workspace-test",
      prompt: "Analyze the project",
    },
  ]);
});

const run = {
  id: "run-test",
  createdAt: now,
  updatedAt: now,
  missionId: "mission-test",
  workspaceId: "workspace-test",
  executorId: "executor-test",
  status: "running",
  artifactIds: [],
};

const runEvents = [
  {
    id: "event-1",
    type: "run.started",
    occurredAt: now,
    spaceId: "space-test",
    missionId: "mission-test",
    runId: "run-test",
    executorId: "executor-test",
  },
  {
    id: "event-2",
    type: "run.stream",
    occurredAt: now,
    spaceId: "space-test",
    runId: "run-test",
    chunk: "working",
  },
  {
    id: "event-3",
    type: "approval.requested",
    occurredAt: now,
    spaceId: "space-test",
    runId: "run-test",
    approvalId: "approval-test",
  },
  {
    id: "event-4",
    type: "approval.granted",
    occurredAt: now,
    spaceId: "space-test",
    runId: "run-test",
    approvalId: "approval-test",
  },
  {
    id: "event-5",
    type: "artifact.created",
    occurredAt: now,
    spaceId: "space-test",
    runId: "run-test",
    artifactId: "artifact-test",
  },
  {
    id: "event-6",
    type: "run.completed",
    occurredAt: now,
    spaceId: "space-test",
    runId: "run-test",
  },
];

test("reduceRunSnapshot consumes run, approval, and artifact events", () => {
  const snapshot = runEvents.reduce(reduceRunSnapshot, createRunSnapshot(run));

  assert.deepEqual(snapshot, {
    runId: "run-test",
    status: "completed",
    stream: ["working"],
    artifactIds: ["artifact-test"],
    approvals: [{ approvalId: "approval-test", status: "granted" }],
  });
});

test("ControlPlane consumes executor events and collects artifacts", async () => {
  const executor = createMockExecutor(runEvents);
  const controlPlane = new ControlPlane(
    { missionId: () => "mission-test" },
    { now: () => now },
  );

  const result = await controlPlane.runMissionToCompletion({
    spaceId: "space-test",
    threadId: "thread-test",
    workspaceId: "workspace-test",
    goal: "Analyze the project",
    executor,
  });

  assert.equal(result.run.status, "completed");
  assert.deepEqual(result.run.artifactIds, ["artifact-test"]);
  assert.deepEqual(result.snapshot.stream, ["working"]);
  assert.deepEqual(result.artifacts.map((artifact) => artifact.id), ["artifact-test"]);
  assert.equal(result.events.length, runEvents.length);
  assert.deepEqual(executor.calls.collectArtifacts, ["run-test"]);
});

test("ControlPlane submits approval decisions through the selected executor", async () => {
  const executor = createMockExecutor([]);
  const controlPlane = new ControlPlane(
    { missionId: () => "mission-test" },
    { now: () => now },
  );

  await controlPlane.submitApproval(executor, "run-test", {
    approvalId: "approval-test",
    decision: "grant",
  });

  assert.deepEqual(executor.calls.submitApproval, [
    {
      runId: "run-test",
      decision: {
        approvalId: "approval-test",
        decision: "grant",
      },
    },
  ]);
});
