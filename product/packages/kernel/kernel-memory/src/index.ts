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

export type MemoryRetrievalMode = "search" | "recent" | "get";

export interface MemoryRetrievalRequest {
  mode?: MemoryRetrievalMode;
  query?: string | undefined;
  workspaceId?: string | undefined;
  ids?: string[] | undefined;
  limit?: number | undefined;
  now?: string | undefined;
}

export interface MemoryRetrievalTraceEntry {
  memoryId: string;
  title: string;
  score: number;
  relevanceScore: number;
  recencyScore: number;
  scopeWeight: number;
  sensitivityWeight: number;
}

export interface MemoryRetrievalTrace {
  mode: MemoryRetrievalMode;
  query?: string;
  workspaceId?: string;
  candidateCount: number;
  returnedCount: number;
  entries: MemoryRetrievalTraceEntry[];
}

export interface MemoryRetrievalResult {
  memories: RetrievedMemory[];
  trace: MemoryRetrievalTrace;
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
  options: { limit?: number; workspaceId?: string; now?: string } = {},
): RetrievedMemory[] {
  return searchMemories(memories, query, options).memories;
}

export function searchMemories(
  memories: MemoryRecord[],
  query: string,
  options: { limit?: number; workspaceId?: string; now?: string } = {},
): MemoryRetrievalResult {
  return retrieveMemories(memories, {
    mode: "search",
    query,
    limit: options.limit,
    workspaceId: options.workspaceId,
    now: options.now,
  });
}

export function listRecentMemories(
  memories: MemoryRecord[],
  options: { limit?: number; workspaceId?: string; now?: string } = {},
): MemoryRetrievalResult {
  return retrieveMemories(memories, {
    mode: "recent",
    limit: options.limit,
    workspaceId: options.workspaceId,
    now: options.now,
  });
}

export function getMemoriesById(
  memories: MemoryRecord[],
  ids: string[],
  options: { workspaceId?: string; now?: string } = {},
): MemoryRetrievalResult {
  return retrieveMemories(memories, {
    mode: "get",
    ids,
    workspaceId: options.workspaceId,
    now: options.now,
    limit: ids.length,
  });
}

export function retrieveMemories(
  memories: MemoryRecord[],
  request: MemoryRetrievalRequest,
): MemoryRetrievalResult {
  const mode = request.mode ?? "search";
  const limit = request.limit ?? 3;
  const nowMs = Date.parse(request.now ?? new Date().toISOString());
  const candidates = filterMemoriesForWorkspace(memories, request.workspaceId);
  const queryTerms = mode === "search" ? extractSearchTerms(request.query ?? "") : [];
  const selected = mode === "get"
    ? selectMemoriesById(candidates, request.ids ?? [], request.workspaceId, nowMs)
    : candidates
      .map((memory) => scoreMemory(memory, {
        queryTerms,
        mode,
        workspaceId: request.workspaceId,
        nowMs,
      }))
      .filter((entry) => entry.score > 0 || mode === "recent")
      .sort((left, right) => right.score - left.score || left.memory.title.localeCompare(right.memory.title))
      .slice(0, limit);

  return {
    memories: selected.map(({ memory, score }) => ({
      memoryId: memory.id,
      title: memory.title,
      content: memory.content,
      sensitivity: memory.sensitivity,
      scope: memory.scope,
      ...(memory.workspaceId ? { workspaceId: memory.workspaceId } : {}),
      score,
    })),
    trace: {
      mode,
      ...(request.query ? { query: request.query } : {}),
      ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
      candidateCount: candidates.length,
      returnedCount: selected.length,
      entries: selected.map((entry) => ({
        memoryId: entry.memory.id,
        title: entry.memory.title,
        score: entry.score,
        relevanceScore: entry.relevanceScore,
        recencyScore: entry.recencyScore,
        scopeWeight: entry.scopeWeight,
        sensitivityWeight: entry.sensitivityWeight,
      })),
    },
  };
}

export function createMemoryUsageSummary(memories: RetrievedMemory[]): string {
  if (memories.length === 0) return "";

  return [
    "Memory context:",
    ...memories.map((memory) => `- ${memory.title}: ${memory.content}`),
  ].join("\n");
}

function filterMemoriesForWorkspace(memories: MemoryRecord[], workspaceId?: string): MemoryRecord[] {
  if (!workspaceId) return [...memories];
  return memories.filter((memory) => memory.scope === "personal" || memory.workspaceId === workspaceId);
}

function selectMemoriesById(
  memories: MemoryRecord[],
  ids: string[],
  workspaceId: string | undefined,
  nowMs: number,
) {
  const idOrder = new Map(ids.map((id, index) => [id, index]));
  return memories
    .filter((memory) => idOrder.has(memory.id))
    .map((memory) => scoreMemory(memory, {
      queryTerms: [],
      mode: "get",
      workspaceId,
      nowMs,
    }))
    .sort((left, right) => (idOrder.get(left.memory.id) ?? 0) - (idOrder.get(right.memory.id) ?? 0));
}

function scoreMemory(memory: MemoryRecord, input: {
  queryTerms: string[];
  mode: MemoryRetrievalMode;
  workspaceId: string | undefined;
  nowMs: number;
}) {
  const memoryTerms = extractSearchTerms(`${memory.title} ${memory.content}`);
  const overlap = input.queryTerms.filter((term) => memoryTerms.includes(term));
  const relevanceScore = input.mode === "recent" || input.mode === "get"
    ? input.mode === "get" ? 1 : 0
    : input.queryTerms.length === 0 ? 0 : overlap.length / input.queryTerms.length;
  if (input.mode === "search" && relevanceScore <= 0) {
    return {
      memory,
      score: 0,
      relevanceScore: 0,
      recencyScore: 0,
      scopeWeight: 1,
      sensitivityWeight: 1,
    };
  }

  const recencyScore = calculateRecencyScore(memory, input.nowMs);
  const scopeWeight = input.workspaceId && memory.scope === "workspace" && memory.workspaceId === input.workspaceId ? 1.15 : 1;
  const sensitivityWeight = memory.sensitivity === "high" ? 0.8 : memory.sensitivity === "medium" ? 0.9 : 1;
  const baseScore = input.mode === "recent"
    ? 1 + recencyScore
    : input.mode === "get"
      ? 1 + recencyScore
      : (relevanceScore * 10) + recencyScore;

  return {
    memory,
    score: Number((baseScore * scopeWeight * sensitivityWeight).toFixed(4)),
    relevanceScore: Number(relevanceScore.toFixed(4)),
    recencyScore: Number(recencyScore.toFixed(4)),
    scopeWeight,
    sensitivityWeight,
  };
}

function calculateRecencyScore(memory: MemoryRecord, nowMs: number): number {
  const source = memory.lastUsedAt ?? memory.updatedAt ?? memory.createdAt;
  const parsed = Date.parse(source);
  if (Number.isNaN(parsed)) return 0;
  const ageMs = Math.max(nowMs - parsed, 0);
  const ageDays = ageMs / 86400000;
  return Number((1 / (1 + ageDays)).toFixed(4));
}

function extractSearchTerms(value: string): string[] {
  if (!value.trim()) return [];
  return [...new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9\u4e00-\u9fff]+/i)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2),
  )];
}
