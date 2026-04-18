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
