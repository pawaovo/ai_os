export type ApprovalRiskCategory = "file-write" | "shell-command" | "network" | "code-executor";
export type ApprovalRiskLevel = "low" | "medium" | "high";
export type ApprovalStatus = "pending" | "granted" | "rejected";
export type ApprovalDecision = "grant" | "reject";
export type WorkspaceTrustLevel = "strict" | "trusted-local-writes";

export interface ApprovalRequirement {
  category: ApprovalRiskCategory;
  riskLevel: ApprovalRiskLevel;
  reason: string;
  requestedAction: string;
  autoDecision?: Extract<ApprovalDecision, "grant">;
}

export interface ApprovalRecord {
  approvalId: string;
  runId: string;
  workspaceId?: string;
  executorChoice: string;
  category: ApprovalRiskCategory;
  riskLevel: ApprovalRiskLevel;
  reason: string;
  requestedAction: string;
  status: ApprovalStatus;
  decision?: ApprovalDecision;
  requestedAt: string;
  resolvedAt?: string;
  note?: string;
}

export interface AssessRunApprovalInput {
  goal: string;
  executorChoice: "mock" | "codex" | "claude-code" | string;
  workspacePath?: string;
  trustLevel?: WorkspaceTrustLevel;
}

const NETWORK_PATTERN = /\b(network|internet|http|https|fetch|download|upload|post|send|email|webhook|api call)\b/i;
const SHELL_PATTERN = /\b(shell|terminal|bash|zsh|command|install|npm|pnpm|yarn|pip|brew|sudo|chmod|rm\s+-rf)\b/i;
const FILE_WRITE_PATTERN = /\b(write|edit|modify|patch|create|save|delete|remove|rename|move|diff)\b/i;
const DESTRUCTIVE_FILE_PATTERN = /\b(delete|remove|rm\s+-rf|overwrite)\b/i;

export function assessRunApproval(input: AssessRunApprovalInput): ApprovalRequirement | undefined {
  const goal = input.goal.trim();
  const workspacePath = input.workspacePath ?? "the active workspace";

  if (NETWORK_PATTERN.test(goal)) {
    return {
      category: "network",
      riskLevel: "high",
      reason: `Network or external-send action requested from ${workspacePath}.`,
      requestedAction: summarizeGoal(goal),
    };
  }

  if (SHELL_PATTERN.test(goal)) {
    return {
      category: "shell-command",
      riskLevel: "high",
      reason: `Shell or install command requested in ${workspacePath}.`,
      requestedAction: summarizeGoal(goal),
    };
  }

  if (FILE_WRITE_PATTERN.test(goal)) {
    const riskLevel: ApprovalRiskLevel = DESTRUCTIVE_FILE_PATTERN.test(goal) ? "high" : "medium";
    return {
      category: "file-write",
      riskLevel,
      reason: `File mutation requested in ${workspacePath}.`,
      requestedAction: summarizeGoal(goal),
      ...(riskLevel === "medium" && input.trustLevel === "trusted-local-writes" ? { autoDecision: "grant" } : {}),
    };
  }

  if (input.executorChoice === "codex" || input.executorChoice === "claude-code") {
    return {
      category: "code-executor",
      riskLevel: "medium",
      reason: `${input.executorChoice} will run against ${workspacePath}.`,
      requestedAction: summarizeGoal(goal),
    };
  }

  return undefined;
}

export function normalizeWorkspaceTrustLevel(value: unknown): WorkspaceTrustLevel {
  return value === "trusted-local-writes" ? "trusted-local-writes" : "strict";
}

export function normalizeApprovalDecision(value: unknown): ApprovalDecision {
  switch (value) {
    case "grant":
    case "reject":
      return value;
    default:
      throw new Error("Unsupported approval decision.");
  }
}

function summarizeGoal(goal: string): string {
  const normalized = goal.replace(/\s+/g, " ").trim();
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}
