import test, { mock } from "node:test";
import assert from "node:assert/strict";

import {
  CompanionCore,
  createCompanionRunStatusSummary,
} from "../packages/companion/companion-core/dist/index.js";

const now = "2026-04-18T00:00:00.000Z";

function createOutcome({
  missionStatus = "running",
  runStatus = "completed",
  approvals = [],
  artifactIds = [],
  stream = [],
  error,
} = {}) {
  return {
    mission: {
      id: "mission-test",
      createdAt: now,
      updatedAt: now,
      spaceId: "space-test",
      threadId: "thread-test",
      goal: "Prepare the workspace",
      status: missionStatus,
      runIds: ["run-test"],
    },
    run: {
      id: "run-test",
      createdAt: now,
      updatedAt: now,
      missionId: "mission-test",
      workspaceId: "workspace-test",
      executorId: "executor-test",
      status: runStatus,
      artifactIds,
    },
    snapshot: {
      runId: "run-test",
      status: runStatus === "queued" ? "running" : runStatus,
      stream,
      artifactIds,
      approvals,
      ...(error ? { error } : {}),
    },
  };
}

test("CompanionCore delegates goal handling to the injected control plane facade", async () => {
  const runGoal = mock.fn(async () =>
    createOutcome({
      artifactIds: ["artifact-test"],
      stream: ["mission complete"],
    }),
  );
  const companion = new CompanionCore({ runGoal });
  const goalInput = {
    spaceId: "space-test",
    threadId: "thread-test",
    workspaceId: "workspace-test",
    goal: "Prepare the workspace",
  };

  const summary = await companion.receiveGoal(goalInput);

  assert.equal(runGoal.mock.calls.length, 1);
  assert.deepEqual(runGoal.mock.calls[0].arguments, [goalInput]);
  assert.equal("executor" in runGoal.mock.calls[0].arguments[0], false);
  assert.deepEqual(summary, {
    goal: "Prepare the workspace",
    missionId: "mission-test",
    missionStatus: "completed",
    runId: "run-test",
    runStatus: "completed",
    approvalStatus: "none",
    artifactCount: 1,
    latestOutput: "mission complete",
  });
});

test("createCompanionRunStatusSummary reports blocked and failed mission states from control-plane output", () => {
  const awaitingApproval = createOutcome({
    runStatus: "awaiting-approval",
    approvals: [{ approvalId: "approval-test", status: "pending" }],
    stream: ["waiting for approval"],
  });

  assert.deepEqual(createCompanionRunStatusSummary(awaitingApproval), {
    goal: "Prepare the workspace",
    missionId: "mission-test",
    missionStatus: "blocked",
    runId: "run-test",
    runStatus: "awaiting-approval",
    approvalStatus: "pending",
    artifactCount: 0,
    latestOutput: "waiting for approval",
  });

  const failed = createOutcome({
    runStatus: "failed",
    approvals: [{ approvalId: "approval-test", status: "rejected" }],
    stream: ["tool crashed"],
    error: "tool crashed",
  });

  assert.deepEqual(createCompanionRunStatusSummary(failed), {
    goal: "Prepare the workspace",
    missionId: "mission-test",
    missionStatus: "failed",
    runId: "run-test",
    runStatus: "failed",
    approvalStatus: "rejected",
    artifactCount: 0,
    latestOutput: "tool crashed",
    error: "tool crashed",
  });
});
