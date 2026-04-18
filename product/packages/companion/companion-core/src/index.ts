import type { ControlPlaneApprovalStatus, ControlPlaneRunSnapshot } from "@ai-os/control-plane";
import type {
  Mission,
  MissionId,
  MissionStatus,
  Run,
  RunId,
  RunStatus,
  SpaceId,
  ThreadId,
  WorkspaceId,
} from "@ai-os/kernel-objects";

export interface CompanionGoalInput {
  spaceId: SpaceId;
  threadId: ThreadId;
  workspaceId: WorkspaceId;
  goal: string;
  prompt?: string;
}

export interface CompanionGoalOutcome {
  mission: Mission;
  run: Run;
  snapshot: ControlPlaneRunSnapshot;
}

export interface CompanionControlPlane {
  runGoal(input: CompanionGoalInput): Promise<CompanionGoalOutcome>;
}

export type CompanionApprovalSummaryStatus = ControlPlaneApprovalStatus | "none";

export interface CompanionRunStatusSummary {
  goal: string;
  missionId: MissionId;
  missionStatus: MissionStatus;
  runId: RunId;
  runStatus: RunStatus;
  approvalStatus: CompanionApprovalSummaryStatus;
  artifactCount: number;
  latestOutput?: string;
  error?: string;
}

export class CompanionCore {
  constructor(private readonly controlPlane: CompanionControlPlane) {}

  async receiveGoal(input: CompanionGoalInput): Promise<CompanionRunStatusSummary> {
    const outcome = await this.controlPlane.runGoal(input);
    return createCompanionRunStatusSummary(outcome);
  }
}

export function createCompanionRunStatusSummary(
  outcome: CompanionGoalOutcome,
): CompanionRunStatusSummary {
  const { mission, run, snapshot } = outcome;
  const latestOutput = snapshot.stream.at(-1);

  return {
    goal: mission.goal,
    missionId: mission.id,
    missionStatus: summarizeMissionStatus(mission.status, run.status),
    runId: run.id,
    runStatus: run.status,
    approvalStatus: summarizeApprovalStatus(snapshot),
    artifactCount: snapshot.artifactIds.length,
    ...(latestOutput ? { latestOutput } : {}),
    ...(snapshot.error ? { error: snapshot.error } : {}),
  };
}

export function summarizeMissionStatus(
  missionStatus: MissionStatus,
  runStatus: RunStatus,
): MissionStatus {
  switch (missionStatus) {
    case "completed":
    case "failed":
    case "cancelled":
      return missionStatus;
    case "blocked":
      return runStatus === "running" ? "running" : "blocked";
    case "draft":
    case "running":
      return summarizeMissionStatusFromRun(runStatus);
  }
}

export function summarizeApprovalStatus(
  snapshot: Pick<ControlPlaneRunSnapshot, "approvals">,
): CompanionApprovalSummaryStatus {
  if (snapshot.approvals.length === 0) {
    return "none";
  }

  if (snapshot.approvals.some((approval) => approval.status === "pending")) {
    return "pending";
  }

  return snapshot.approvals.at(-1)?.status ?? "none";
}

function summarizeMissionStatusFromRun(runStatus: RunStatus): MissionStatus {
  switch (runStatus) {
    case "awaiting-approval":
      return "blocked";
    case "completed":
      return "completed";
    case "failed":
    case "interrupted":
      return "failed";
    case "queued":
    case "running":
      return "running";
  }
}
