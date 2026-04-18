import type { Artifact, ArtifactId, ArtifactKind, RunId, SpaceId } from "@ai-os/kernel-objects";

export interface ArtifactReference {
  artifactId: ArtifactId;
  kind: ArtifactKind;
  title: Artifact["title"];
  content?: Artifact["content"];
  path?: Artifact["path"];
}

export type ArtifactReferenceInput = Pick<Artifact, "id" | "kind" | "title" | "content" | "path">;

export interface ArtifactRunLink {
  artifactId: ArtifactId;
  runId: RunId;
}

export interface ArtifactSpaceLink {
  artifactId: ArtifactId;
  spaceId: SpaceId;
}

export interface ArtifactLinks {
  run: ArtifactRunLink;
  space: ArtifactSpaceLink;
}

export function createArtifactReference(input: ArtifactReferenceInput): ArtifactReference {
  return {
    artifactId: input.id,
    kind: input.kind,
    title: input.title,
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.path !== undefined ? { path: input.path } : {}),
  };
}

export function linkArtifactToRun(
  artifact: Pick<ArtifactReference, "artifactId">,
  runId: RunId,
): ArtifactRunLink {
  return {
    artifactId: artifact.artifactId,
    runId,
  };
}

export function linkArtifactToSpace(
  artifact: Pick<ArtifactReference, "artifactId">,
  spaceId: SpaceId,
): ArtifactSpaceLink {
  return {
    artifactId: artifact.artifactId,
    spaceId,
  };
}

export function createArtifactLinks(
  artifact: Pick<ArtifactReference, "artifactId">,
  input: Pick<Artifact, "runId" | "spaceId">,
): ArtifactLinks {
  return {
    run: linkArtifactToRun(artifact, input.runId),
    space: linkArtifactToSpace(artifact, input.spaceId),
  };
}
