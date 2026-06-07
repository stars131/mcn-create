import { nextId, store } from "@/server/services/mock-store";
import type { ContentDraft, ContentVersion } from "@/types/domain";

export function recordContentVersion(input: {
  content: ContentDraft;
  changeNote?: string;
  createdById?: string;
}): ContentVersion {
  const now = new Date().toISOString();
  const version: ContentVersion = {
    id: nextId("content_version"),
    workspaceId: input.content.workspaceId,
    contentDraftId: input.content.id,
    version: input.content.currentVersion,
    content: input.content.content,
    changeNote: input.changeNote,
    createdById: input.createdById,
    createdAt: now,
    updatedAt: now
  };
  store.contentVersions.unshift(version);
  return version;
}

export function listContentVersions(workspaceId: string, contentDraftId: string) {
  return store.contentVersions
    .filter((version) => version.workspaceId === workspaceId && version.contentDraftId === contentDraftId)
    .sort((a, b) => b.version - a.version);
}
