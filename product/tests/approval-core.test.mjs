import test from "node:test";
import assert from "node:assert/strict";

import {
  assessRunApproval,
  normalizeApprovalDecision,
  normalizeWorkspaceTrustLevel,
} from "../packages/control/approval-core/dist/index.js";

test("assessRunApproval classifies file, shell, network, and executor risks", () => {
  assert.deepEqual(
    assessRunApproval({
      goal: "write a local report",
      executorChoice: "mock",
      workspacePath: "/tmp/work",
      trustLevel: "strict",
    }),
    {
      category: "file-write",
      riskLevel: "medium",
      reason: "File mutation requested in /tmp/work.",
      requestedAction: "write a local report",
    },
  );

  assert.deepEqual(
    assessRunApproval({
      goal: "delete generated files",
      executorChoice: "mock",
      workspacePath: "/tmp/work",
      trustLevel: "trusted-local-writes",
    })?.riskLevel,
    "high",
  );

  assert.deepEqual(
    assessRunApproval({
      goal: "run npm install in terminal",
      executorChoice: "mock",
      workspacePath: "/tmp/work",
      trustLevel: "trusted-local-writes",
    })?.category,
    "shell-command",
  );

  assert.deepEqual(
    assessRunApproval({
      goal: "download and upload a report",
      executorChoice: "mock",
      workspacePath: "/tmp/work",
      trustLevel: "trusted-local-writes",
    })?.category,
    "network",
  );

  assert.deepEqual(
    assessRunApproval({
      goal: "summarize repository",
      executorChoice: "codex",
      workspacePath: "/tmp/work",
      trustLevel: "strict",
    })?.category,
    "code-executor",
  );
});

test("trusted local writes auto-grant only medium local file-write requests", () => {
  assert.equal(
    assessRunApproval({
      goal: "edit a markdown note",
      executorChoice: "mock",
      workspacePath: "/tmp/work",
      trustLevel: "trusted-local-writes",
    })?.autoDecision,
    "grant",
  );

  assert.equal(
    assessRunApproval({
      goal: "run shell command",
      executorChoice: "mock",
      workspacePath: "/tmp/work",
      trustLevel: "trusted-local-writes",
    })?.autoDecision,
    undefined,
  );
});

test("approval normalizers reject unsupported values", () => {
  assert.equal(normalizeWorkspaceTrustLevel("trusted-local-writes"), "trusted-local-writes");
  assert.equal(normalizeWorkspaceTrustLevel("other"), "strict");
  assert.equal(normalizeApprovalDecision("grant"), "grant");
  assert.throws(() => normalizeApprovalDecision("allow"), /Unsupported approval decision/);
});
