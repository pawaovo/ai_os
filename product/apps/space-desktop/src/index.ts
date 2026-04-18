import type { Artifact, RunStatus, ThreadId } from "@ai-os/kernel-objects";

export type SpaceDesktopSectionKind = "chat" | "run-status" | "artifact-list";

export interface SpaceDesktopArtifactListItem {
  id: string;
  kind: Artifact["kind"];
  title: string;
  path?: string;
}

export interface SpaceDesktopChatSection {
  kind: "chat";
  title: string;
  threadId?: ThreadId;
  transcriptPreview: string[];
  composerPlaceholder: string;
  emptyState: string;
}

export interface SpaceDesktopRunStatusSection {
  kind: "run-status";
  title: string;
  status: RunStatus;
  summary: string;
}

export interface SpaceDesktopArtifactListSection {
  kind: "artifact-list";
  title: string;
  items: SpaceDesktopArtifactListItem[];
  emptyState: string;
}

export type SpaceDesktopShellSection =
  | SpaceDesktopChatSection
  | SpaceDesktopRunStatusSection
  | SpaceDesktopArtifactListSection;

export interface SpaceDesktopShellModel {
  appId: "space-desktop";
  title: string;
  sections: [SpaceDesktopChatSection, SpaceDesktopRunStatusSection, SpaceDesktopArtifactListSection];
}

export interface CreateSpaceDesktopShellModelInput {
  title?: string;
  threadId?: ThreadId;
  transcriptPreview?: Iterable<string>;
  runStatus?: RunStatus;
  runStatusSummary?: string;
  artifacts?: Iterable<SpaceDesktopArtifactListItem>;
}

const DEFAULT_TITLE = "AI Space Desktop";
const CHAT_SECTION_TITLE = "Chat";
const RUN_STATUS_SECTION_TITLE = "Run Status";
const ARTIFACT_LIST_SECTION_TITLE = "Artifacts";

export function createSpaceDesktopShellModel(
  input: CreateSpaceDesktopShellModelInput = {},
): SpaceDesktopShellModel {
  const transcriptPreview = normalizeTranscriptPreview(input.transcriptPreview);
  const artifacts = normalizeArtifacts(input.artifacts);
  const runStatus = input.runStatus ?? "queued";

  return {
    appId: "space-desktop",
    title: input.title ?? DEFAULT_TITLE,
    sections: [
      {
        kind: "chat",
        title: CHAT_SECTION_TITLE,
        ...(input.threadId ? { threadId: input.threadId } : {}),
        transcriptPreview,
        composerPlaceholder: "Ask AI Space to help with your workspace.",
        emptyState:
          transcriptPreview.length > 0 ? "Recent conversation is ready." : "No conversation loaded yet.",
      },
      {
        kind: "run-status",
        title: RUN_STATUS_SECTION_TITLE,
        status: runStatus,
        summary: input.runStatusSummary ?? describeRunStatus(runStatus),
      },
      {
        kind: "artifact-list",
        title: ARTIFACT_LIST_SECTION_TITLE,
        items: artifacts,
        emptyState:
          artifacts.length > 0
            ? `${artifacts.length} artifact${artifacts.length === 1 ? "" : "s"} ready.`
            : "Run outputs will appear here.",
      },
    ],
  };
}

function normalizeTranscriptPreview(transcriptPreview: Iterable<string> | undefined): string[] {
  return transcriptPreview ? [...transcriptPreview] : [];
}

function normalizeArtifacts(
  artifacts: Iterable<SpaceDesktopArtifactListItem> | undefined,
): SpaceDesktopArtifactListItem[] {
  if (!artifacts) return [];

  return [...artifacts].map((artifact) => ({
    id: artifact.id,
    kind: artifact.kind,
    title: artifact.title,
    ...(artifact.path ? { path: artifact.path } : {}),
  }));
}

function describeRunStatus(status: RunStatus): string {
  switch (status) {
    case "queued":
      return "No run started.";
    case "running":
      return "Executor is working.";
    case "awaiting-approval":
      return "Waiting for approval to continue.";
    case "completed":
      return "Run completed.";
    case "failed":
      return "Run failed.";
    case "interrupted":
      return "Run interrupted.";
  }
}
