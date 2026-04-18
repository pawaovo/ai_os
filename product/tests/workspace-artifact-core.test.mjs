import test from "node:test";
import assert from "node:assert/strict";

import { createArtifactLinks, createArtifactReference, linkArtifactToRun, linkArtifactToSpace } from "../packages/workspace/artifact-core/dist/index.js";
import { createWorkspaceReference } from "../packages/workspace/workspace-core/dist/index.js";

const now = "2026-04-18T00:00:00.000Z";

test("createWorkspaceReference builds a lightweight reference from a mocked kernel workspace", () => {
  const reference = createWorkspaceReference({
    id: "workspace-main",
    createdAt: now,
    updatedAt: now,
    kind: "local-directory",
    name: "Main Workspace",
    path: "/tmp/ai-os/main",
    spaceId: "space-home",
  });

  assert.deepEqual(reference, {
    workspaceId: "workspace-main",
    spaceId: "space-home",
    kind: "local-directory",
    name: "Main Workspace",
    path: "/tmp/ai-os/main",
  });
});

test("createArtifactReference keeps artifact metadata detached from run and space links", () => {
  const reference = createArtifactReference({
    id: "artifact-report",
    createdAt: now,
    updatedAt: now,
    spaceId: "space-home",
    runId: "run-42",
    kind: "report",
    title: "Plan Summary",
    content: "# Summary",
  });

  assert.deepEqual(reference, {
    artifactId: "artifact-report",
    kind: "report",
    title: "Plan Summary",
    content: "# Summary",
  });
});

test("linkArtifactToRun and linkArtifactToSpace create explicit artifact relationship records", () => {
  const artifact = createArtifactReference({
    id: "artifact-report",
    createdAt: now,
    updatedAt: now,
    spaceId: "space-home",
    runId: "run-42",
    kind: "report",
    title: "Plan Summary",
    path: "/tmp/ai-os/main/summary.md",
  });

  assert.deepEqual(linkArtifactToRun(artifact, "run-99"), {
    artifactId: "artifact-report",
    runId: "run-99",
  });

  assert.deepEqual(linkArtifactToSpace(artifact, "space-archive"), {
    artifactId: "artifact-report",
    spaceId: "space-archive",
  });
});

test("createArtifactLinks derives run and space links from kernel ids without extra storage concerns", () => {
  const artifact = createArtifactReference({
    id: "artifact-file",
    createdAt: now,
    updatedAt: now,
    spaceId: "space-home",
    runId: "run-42",
    kind: "file",
    title: "Generated Draft",
    path: "/tmp/ai-os/main/draft.md",
  });

  assert.deepEqual(
    createArtifactLinks(artifact, {
      runId: "run-42",
      spaceId: "space-home",
    }),
    {
      run: {
        artifactId: "artifact-file",
        runId: "run-42",
      },
      space: {
        artifactId: "artifact-file",
        spaceId: "space-home",
      },
    },
  );
});
