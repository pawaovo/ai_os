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
