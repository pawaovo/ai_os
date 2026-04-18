export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type SpaceId = Brand<string, "SpaceId">;
export type WorkspaceId = Brand<string, "WorkspaceId">;
export type ThreadId = Brand<string, "ThreadId">;
export type MessageId = Brand<string, "MessageId">;
export type MissionId = Brand<string, "MissionId">;
export type RunId = Brand<string, "RunId">;
export type ArtifactId = Brand<string, "ArtifactId">;
export type ApprovalId = Brand<string, "ApprovalId">;
export type ProviderId = Brand<string, "ProviderId">;
export type ExecutorId = Brand<string, "ExecutorId">;
export type IsoDateTime = Brand<string, "IsoDateTime">;

export type WorkspaceKind = "local-directory" | "git-worktree" | "virtual";
export type ThreadKind = "chat" | "mission" | "automation";
export type MessageRole = "user" | "assistant" | "system" | "tool";
export type MissionStatus = "draft" | "running" | "blocked" | "completed" | "failed" | "cancelled";
export type RunStatus = "queued" | "running" | "awaiting-approval" | "completed" | "failed" | "interrupted";
export type ArtifactKind = "markdown" | "text" | "file" | "diff" | "report" | "link";
export type ApprovalStatus = "pending" | "granted" | "rejected" | "expired";

export interface KernelObjectBase<TId extends string> {
  id: TId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Space extends KernelObjectBase<SpaceId> {
  name: string;
  description?: string;
  workspaceIds: WorkspaceId[];
}

export interface Workspace extends KernelObjectBase<WorkspaceId> {
  kind: WorkspaceKind;
  name: string;
  path?: string;
  spaceId: SpaceId;
}

export interface Thread extends KernelObjectBase<ThreadId> {
  kind: ThreadKind;
  spaceId: SpaceId;
  title: string;
  messageIds: MessageId[];
}

export interface Message extends KernelObjectBase<MessageId> {
  threadId: ThreadId;
  role: MessageRole;
  content: string;
}

export interface Mission extends KernelObjectBase<MissionId> {
  spaceId: SpaceId;
  threadId: ThreadId;
  goal: string;
  status: MissionStatus;
  runIds: RunId[];
}

export interface Run extends KernelObjectBase<RunId> {
  missionId: MissionId;
  workspaceId: WorkspaceId;
  executorId: ExecutorId;
  status: RunStatus;
  artifactIds: ArtifactId[];
}

export interface Artifact extends KernelObjectBase<ArtifactId> {
  spaceId: SpaceId;
  runId: RunId;
  kind: ArtifactKind;
  title: string;
  content?: string;
  path?: string;
}

export interface Approval extends KernelObjectBase<ApprovalId> {
  runId: RunId;
  status: ApprovalStatus;
  reason: string;
  requestedAction: string;
}

