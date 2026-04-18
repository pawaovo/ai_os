import type { SpaceId, Workspace, WorkspaceId, WorkspaceKind } from "@ai-os/kernel-objects";

export interface WorkspaceReference {
  workspaceId: WorkspaceId;
  spaceId: SpaceId;
  kind: WorkspaceKind;
  name: Workspace["name"];
  path?: Workspace["path"];
}

export type WorkspaceReferenceInput = Pick<Workspace, "id" | "spaceId" | "kind" | "name" | "path">;

export function createWorkspaceReference(input: WorkspaceReferenceInput): WorkspaceReference {
  return {
    workspaceId: input.id,
    spaceId: input.spaceId,
    kind: input.kind,
    name: input.name,
    ...(input.path !== undefined ? { path: input.path } : {}),
  };
}
