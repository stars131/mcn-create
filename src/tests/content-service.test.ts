import { describe, expect, it } from "vitest";
import { adaptContent, listContentVersions, updateContent } from "@/server/services/content-service";
import { store } from "@/server/services/mock-store";

describe("content service", () => {
  it("lists seeded content versions newest first", () => {
    const versions = listContentVersions("ws_demo", "content_001");

    expect(versions.map((version) => version.version)).toEqual([2, 1]);
    expect(versions[0]).toMatchObject({
      contentDraftId: "content_001",
      version: 2,
      changeNote: "人工补充人设记忆和复盘链路"
    });
  });

  it("records a new version when content is updated", () => {
    const content = store.contentDrafts.find((item) => item.id === "content_001");
    expect(content).toBeTruthy();
    const original = {
      ...content!,
      riskItems: [...content!.riskItems]
    };
    const beforeVersionIds = new Set(store.contentVersions.map((version) => version.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const updated = updateContent({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: "content_001",
        patch: {
          title: "更新后的内容标题",
          content: "更新后的内容正文",
          status: "IN_REVIEW"
        }
      });
      const createdVersion = store.contentVersions.find((version) => !beforeVersionIds.has(version.id));

      expect(updated).toMatchObject({
        id: "content_001",
        title: "更新后的内容标题",
        content: "更新后的内容正文",
        status: "IN_REVIEW",
        currentVersion: original.currentVersion + 1
      });
      expect(createdVersion).toMatchObject({
        workspaceId: "ws_demo",
        contentDraftId: "content_001",
        version: original.currentVersion + 1,
        content: "更新后的内容正文",
        changeNote: "人工编辑内容草稿",
        createdById: "user_owner"
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "content.update",
        entityType: "ContentDraft",
        entityId: "content_001",
        metadata: {
          versionId: createdVersion?.id,
          previousVersion: original.currentVersion,
          nextVersion: original.currentVersion + 1
        }
      });
    } finally {
      Object.assign(content!, original);
      store.contentVersions = store.contentVersions.filter((version) => beforeVersionIds.has(version.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });

  it("records an initial version for platform adaptations", () => {
    const beforeContentDraftIds = new Set(store.contentDrafts.map((draft) => draft.id));
    const beforeVersionIds = new Set(store.contentVersions.map((version) => version.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const adapted = adaptContent({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: "content_001",
        platform: "DOUYIN"
      });
      const versions = listContentVersions("ws_demo", adapted.id);

      expect(beforeContentDraftIds.has(adapted.id)).toBe(false);
      expect(adapted).toMatchObject({
        platform: "DOUYIN",
        format: "口播稿",
        status: "DRAFT",
        currentVersion: 1
      });
      expect(versions).toHaveLength(1);
      expect(versions[0]).toMatchObject({
        contentDraftId: adapted.id,
        version: 1,
        content: adapted.content,
        changeNote: "平台适配初稿：DOUYIN",
        createdById: "user_owner"
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "content.adapt",
        entityType: "PlatformAdaptation",
        entityId: adapted.id,
        metadata: {
          sourceContentDraftId: "content_001",
          versionId: versions[0].id,
          currentVersion: 1,
          platform: "DOUYIN"
        }
      });
    } finally {
      store.contentDrafts = store.contentDrafts.filter((draft) => beforeContentDraftIds.has(draft.id));
      store.contentVersions = store.contentVersions.filter((version) => beforeVersionIds.has(version.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });
});
