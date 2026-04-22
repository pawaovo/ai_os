import test from "node:test";
import assert from "node:assert/strict";

import {
  createMemoryUsageSummary,
  getMemoriesById,
  listRecentMemories,
  normalizeMemoryScope,
  normalizeMemorySensitivity,
  searchMemories,
  selectRelevantMemories,
} from "../packages/kernel/kernel-memory/dist/index.js";

test("kernel-memory selects relevant local memories by lexical overlap", () => {
  const memories = [
    {
      id: "memory-1",
      title: "Local-first preference",
      content: "Prefer local-first defaults and concise plans.",
      scope: "personal",
      sensitivity: "low",
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T00:00:00.000Z",
    },
    {
      id: "memory-2",
      title: "Unrelated",
      content: "Something about gardening.",
      scope: "personal",
      sensitivity: "low",
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T00:00:00.000Z",
    },
  ];

  const relevant = selectRelevantMemories(memories, "create a concise local-first plan");
  assert.equal(relevant.length, 1);
  assert.equal(relevant[0].title, "Local-first preference");
  assert.match(createMemoryUsageSummary(relevant), /Memory context/);
});

test("kernel-memory normalizers keep values bounded", () => {
  assert.equal(normalizeMemoryScope("workspace"), "workspace");
  assert.equal(normalizeMemoryScope("other"), "personal");
  assert.equal(normalizeMemorySensitivity("medium"), "medium");
  assert.equal(normalizeMemorySensitivity("other"), "low");
});

test("kernel-memory retrieval ranks by relevance, workspace scope, recency, and sensitivity", () => {
  const memories = [
    {
      id: "memory-workspace-fresh",
      title: "Local-first preference",
      content: "Prefer concise local-first plans for this workspace.",
      scope: "workspace",
      sensitivity: "low",
      workspaceId: "workspace-1",
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-20T00:00:00.000Z",
      lastUsedAt: "2026-04-22T00:00:00.000Z",
    },
    {
      id: "memory-personal-older",
      title: "Local-first preference",
      content: "Prefer local-first defaults in general.",
      scope: "personal",
      sensitivity: "low",
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
      lastUsedAt: "2026-04-11T00:00:00.000Z",
    },
    {
      id: "memory-other-workspace",
      title: "Other workspace",
      content: "Local-first notes for another workspace.",
      scope: "workspace",
      sensitivity: "low",
      workspaceId: "workspace-2",
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z",
    },
    {
      id: "memory-sensitive",
      title: "Local-first preference",
      content: "Prefer local-first notes.",
      scope: "workspace",
      sensitivity: "high",
      workspaceId: "workspace-1",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  ];

  const result = searchMemories(memories, "make a concise local-first plan", {
    workspaceId: "workspace-1",
    now: "2026-04-22T12:00:00.000Z",
    limit: 3,
  });

  assert.deepEqual(
    result.memories.map((memory) => memory.memoryId),
    ["memory-workspace-fresh", "memory-personal-older", "memory-sensitive"],
  );
  assert.equal(result.trace.mode, "search");
  assert.equal(result.trace.workspaceId, "workspace-1");
  assert.equal(result.trace.candidateCount, 3);
  assert.equal(result.trace.entries[0].scopeWeight > result.trace.entries[1].scopeWeight, true);
  assert.equal(result.trace.entries[2].sensitivityWeight, 0.8);
});

test("kernel-memory retrieval exposes recent and get lookup modes", () => {
  const memories = [
    {
      id: "memory-recent",
      title: "Recent memory",
      content: "Fresh note.",
      scope: "personal",
      sensitivity: "low",
      createdAt: "2026-04-20T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z",
      lastUsedAt: "2026-04-22T00:00:00.000Z",
    },
    {
      id: "memory-older",
      title: "Older memory",
      content: "Older note.",
      scope: "personal",
      sensitivity: "low",
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
    },
  ];

  const recent = listRecentMemories(memories, {
    now: "2026-04-22T12:00:00.000Z",
    limit: 2,
  });
  assert.deepEqual(recent.memories.map((memory) => memory.memoryId), ["memory-recent", "memory-older"]);
  assert.equal(recent.trace.mode, "recent");

  const fetched = getMemoriesById(memories, ["memory-older", "memory-recent"]);
  assert.deepEqual(fetched.memories.map((memory) => memory.memoryId), ["memory-older", "memory-recent"]);
  assert.equal(fetched.trace.mode, "get");
});
