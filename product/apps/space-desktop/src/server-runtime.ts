import { ClaudeCodeProcessExecutor } from "@ai-os/executor-claude-code";
import { CodexProcessExecutor } from "@ai-os/executor-codex";
import type { CodeExecutor, ExecutorProcessRunner } from "@ai-os/executor-protocol";
import type { ArtifactId, ExecutorId, IsoDateTime, RunId } from "@ai-os/kernel-objects";

import {
  createFailedSpaceDemoState,
  runSpaceDemoGoal,
  runSpaceDemoGoalWithExecutor,
  type SpaceDemoExecutorChoice,
  type SpaceDemoState,
} from "./demo-runtime.js";

export interface SpaceDemoRunRequest {
  goal: string;
  executorChoice: SpaceDemoExecutorChoice;
}

export interface SpaceDemoServerRuntime {
  runner: ExecutorProcessRunner;
  codexCommand?: string;
  claudeCommand?: string;
}

export interface SpaceDemoRunResponse {
  state: SpaceDemoState;
}

const DEFAULT_CODEX_ARGS = ["exec", "--json", "--sandbox", "read-only", "--skip-git-repo-check"];

export function parseSpaceDemoRunRequest(value: unknown): SpaceDemoRunRequest {
  if (!isRecord(value)) {
    throw new Error("Request body must be a JSON object.");
  }

  if (typeof value.goal !== "string") {
    throw new Error("Request body must include a string goal.");
  }

  return {
    goal: value.goal,
    executorChoice: parseExecutorChoice(value.executorChoice),
  };
}

export async function runSpaceDemoRequest(
  request: SpaceDemoRunRequest,
  runtime: SpaceDemoServerRuntime,
): Promise<SpaceDemoRunResponse> {
  try {
    if (request.executorChoice === "mock") {
      const result = await runSpaceDemoGoal({
        goal: request.goal,
        executorChoice: "mock",
      });
      return { state: result.state };
    }

    const executor = createProcessExecutor(request.executorChoice, runtime);
    const status = await executor.getRuntimeStatus();

    if (!status.available) {
      throw new Error(status.message ?? `${request.executorChoice} is not available.`);
    }

    const result = await runSpaceDemoGoalWithExecutor({
      goal: request.goal,
      executorChoice: request.executorChoice,
      executor,
    });

    return { state: result.state };
  } catch (error) {
    return {
      state: createFailedSpaceDemoState({
        goal: request.goal,
        executorChoice: request.executorChoice,
        error: error instanceof Error ? error.message : "Executor demo run failed.",
      }),
    };
  }
}

function createProcessExecutor(
  executorChoice: Exclude<SpaceDemoExecutorChoice, "mock">,
  runtime: SpaceDemoServerRuntime,
): CodeExecutor {
  const ids = createServerDemoIds();
  const clock = createServerDemoClock();

  if (executorChoice === "codex") {
    return CodexProcessExecutor.create({
      id: "executor-demo-codex" as ExecutorId,
      runner: runtime.runner,
      ids,
      clock,
      args: DEFAULT_CODEX_ARGS,
      ...(runtime.codexCommand !== undefined ? { command: runtime.codexCommand } : {}),
    });
  }

  return ClaudeCodeProcessExecutor.create({
    id: "executor-demo-claude-code" as ExecutorId,
    runner: runtime.runner,
    ids,
    clock,
    ...(runtime.claudeCommand !== undefined ? { command: runtime.claudeCommand } : {}),
  });
}

function parseExecutorChoice(value: unknown): SpaceDemoExecutorChoice {
  switch (value) {
    case "codex":
    case "claude-code":
    case "mock":
    case undefined:
      return value ?? "mock";
    default:
      throw new Error("Unsupported executor choice.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createServerDemoIds() {
  let run = 0;
  let event = 0;
  let artifact = 0;

  return {
    runId: () => `run-server-${Date.now()}-${++run}` as RunId,
    eventId: () => `event-server-${Date.now()}-${++event}`,
    artifactId: () => `artifact-server-${Date.now()}-${++artifact}` as ArtifactId,
  };
}

function createServerDemoClock() {
  return {
    now: () => new Date().toISOString() as IsoDateTime,
  };
}
