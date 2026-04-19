import test from "node:test";
import assert from "node:assert/strict";

import {
  createMemoryUsageSummary,
  normalizeMemoryScope,
  normalizeMemorySensitivity,
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
