export type CapabilityKind = "local";
export type CapabilityPermissionCategory =
  | "workspace-read"
  | "artifact-read"
  | "memory-read"
  | "automation-read";

export interface CapabilityPermission {
  category: CapabilityPermissionCategory;
  description: string;
}

export interface CapabilityDefinition {
  id: string;
  title: string;
  description: string;
  kind: CapabilityKind;
  permissions: CapabilityPermission[];
  defaultEnabled?: boolean;
}

export interface CapabilityRecord extends CapabilityDefinition {
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CapabilityRunRecord {
  id: string;
  capabilityId: string;
  workspaceId?: string;
  status: "completed" | "failed";
  result?: string;
  artifactId?: string;
  startedAt: string;
  completedAt?: string;
}

export interface CapabilityRunEvent {
  id: string;
  capabilityRunId: string;
  type: string;
  message: string;
  createdAt: string;
}

export type PromptAppExecutionMode = "workspace-runtime";
export type PromptAppToolPolicy = "workspace-default";
export type PromptAppArtifactPolicy = "workspace-artifact";

export interface PromptAppRuntimeBinding {
  workspaceId?: string;
  executionMode: PromptAppExecutionMode;
  toolPolicy: PromptAppToolPolicy;
  artifactPolicy: PromptAppArtifactPolicy;
}

export interface PromptAppInstallation {
  installedCapabilityId: string;
  installedAt: string;
}

export interface PromptAppDraftRecord {
  id: string;
  title: string;
  prompt: string;
  inputSpec: string;
  outputSpec: string;
  runtimeBinding: PromptAppRuntimeBinding;
  installation?: PromptAppInstallation;
  sourceRunId?: string;
  workspaceId?: string;
  capabilityId?: string;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
}

export interface RecipeRecord extends PromptAppDraftRecord {}

export interface RecipeTestRecord {
  id: string;
  recipeId: string;
  workspaceId?: string;
  status: "completed" | "failed";
  result?: string;
  startedAt: string;
  completedAt?: string;
}
