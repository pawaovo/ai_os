export type MemoryScope = "personal" | "workspace";
export type MemorySensitivity = "low" | "medium" | "high";

export interface MemoryRecord {
  id: string;
  title: string;
  content: string;
  scope: MemoryScope;
  sensitivity: MemorySensitivity;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface RetrievedMemory {
  memoryId: string;
  title: string;
  content: string;
  sensitivity: MemorySensitivity;
  scope: MemoryScope;
  workspaceId?: string;
  score: number;
}

export function normalizeMemoryScope(value: unknown): MemoryScope {
  return value === "workspace" ? "workspace" : "personal";
}

export function normalizeMemorySensitivity(value: unknown): MemorySensitivity {
  switch (value) {
    case "medium":
    case "high":
      return value;
    default:
      return "low";
  }
}

export function selectRelevantMemories(
  memories: MemoryRecord[],
  query: string,
  options: { limit?: number } = {},
): RetrievedMemory[] {
  const limit = options.limit ?? 3;
  const queryTerms = extractSearchTerms(query);

  return memories
    .map((memory) => ({ memory, score: scoreMemory(memory, queryTerms) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.memory.title.localeCompare(right.memory.title))
    .slice(0, limit)
    .map(({ memory, score }) => ({
      memoryId: memory.id,
      title: memory.title,
      content: memory.content,
      sensitivity: memory.sensitivity,
      scope: memory.scope,
      ...(memory.workspaceId ? { workspaceId: memory.workspaceId } : {}),
      score,
    }));
}

export function createMemoryUsageSummary(memories: RetrievedMemory[]): string {
  if (memories.length === 0) return "";

  return [
    "Memory context:",
    ...memories.map((memory) => `- ${memory.title}: ${memory.content}`),
  ].join("\n");
}

function scoreMemory(memory: MemoryRecord, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 0;
  const memoryTerms = extractSearchTerms(`${memory.title} ${memory.content}`);
  const overlap = queryTerms.filter((term) => memoryTerms.includes(term));
  if (overlap.length === 0) return 0;

  const sensitivityWeight = memory.sensitivity === "high" ? 0.8 : memory.sensitivity === "medium" ? 0.9 : 1;
  return overlap.length * sensitivityWeight;
}

function extractSearchTerms(value: string): string[] {
  return [...new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9\u4e00-\u9fff]+/i)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2),
  )];
}
