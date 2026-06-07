import { describe, expect, it } from "vitest";
import {
  adaptContent,
  listContentBlocks,
  listContentMediaAssets,
  listContentReviews,
  listContentRiskChecks,
  listContentVersions,
  listPlatformAdaptations,
  listPublishPlans,
  listWorkspaceContentTemplates,
  reviewContent,
  riskCheckContent,
  scheduleContent,
  updateContent
} from "@/server/services/content-service";
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

  it("lists seeded content templates, blocks, and media assets", () => {
    const templates = listWorkspaceContentTemplates("ws_demo");
    const blocks = listContentBlocks("ws_demo", "content_001");
    const mediaAssets = listContentMediaAssets("ws_demo", "content_001");

    expect(templates.map((template) => template.platform)).toEqual([
      "BILIBILI",
      "DOUYIN",
      "VIDEO_ACCOUNT",
      "WECHAT",
      "XIAOHONGSHU"
    ]);
    expect(templates.find((template) => template.platform === "XIAOHONGSHU")).toMatchObject({
      name: "小红书图文工作流模板",
      format: "图文",
      version: 1
    });
    expect(blocks.map((block) => block.type)).toEqual(["hook", "workflow", "cta"]);
    expect(blocks[0]).toMatchObject({
      metadata: {
        templateId: "template_xhs_image_text_v1",
        label: "开场钩子"
      }
    });
    expect(mediaAssets[0]).toMatchObject({
      contentDraftId: "content_001",
      sourceType: "USER_UPLOAD",
      assetType: "cover_prompt"
    });
  });

  it("lists seeded governance records for the active draft", () => {
    const riskChecks = listContentRiskChecks("ws_demo", "content_001");
    const reviews = listContentReviews("ws_demo", "content_001");
    const adaptations = listPlatformAdaptations("ws_demo", "content_001");
    const publishPlans = listPublishPlans("ws_demo", "content_001");

    expect(riskChecks[0]).toMatchObject({
      contentDraftId: "content_001",
      riskLevel: "LOW",
      sourceAgentRunId: "run_002"
    });
    expect(reviews[0]).toMatchObject({
      contentDraftId: "content_001",
      status: "IN_REVIEW",
      reviewerId: "user_owner"
    });
    expect(adaptations[0]).toMatchObject({
      contentDraftId: "content_001",
      platform: "DOUYIN"
    });
    expect(publishPlans[0]).toMatchObject({
      contentDraftId: "content_001",
      platform: "XIAOHONGSHU",
      status: "PLANNED"
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
    const beforeContentBlocks = [...store.contentBlocks];
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
      const updatedBlocks = listContentBlocks("ws_demo", "content_001");

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
      expect(updatedBlocks).toHaveLength(5);
      expect(updatedBlocks.map((block) => block.type)).toEqual(["hook", "persona", "brief", "body", "cta"]);
      expect(updatedBlocks[0]).toMatchObject({
        metadata: {
          templateId: "template_xhs_image_text_v1",
          label: "开场钩子"
        }
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "content.update",
        entityType: "ContentDraft",
        entityId: "content_001",
        metadata: {
          versionId: createdVersion?.id,
          templateId: "template_xhs_image_text_v1",
          blockCount: 5,
          previousVersion: original.currentVersion,
          nextVersion: original.currentVersion + 1
        }
      });
    } finally {
      Object.assign(content!, original);
      store.contentVersions = store.contentVersions.filter((version) => beforeVersionIds.has(version.id));
      store.contentBlocks = beforeContentBlocks;
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });

  it("records an initial version for platform adaptations", () => {
    const beforeContentDraftIds = new Set(store.contentDrafts.map((draft) => draft.id));
    const beforeVersionIds = new Set(store.contentVersions.map((version) => version.id));
    const beforeBlockIds = new Set(store.contentBlocks.map((block) => block.id));
    const beforeMediaIds = new Set(store.mediaAssets.map((asset) => asset.id));
    const beforeAdaptationIds = new Set(store.platformAdaptations.map((adaptation) => adaptation.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const adapted = adaptContent({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: "content_001",
        platform: "DOUYIN"
      });
      const versions = listContentVersions("ws_demo", adapted.id);
      const createdAdaptation = store.platformAdaptations.find(
        (adaptation) => !beforeAdaptationIds.has(adaptation.id)
      );
      const createdBlocks = listContentBlocks("ws_demo", adapted.id);
      const createdMediaAsset = store.mediaAssets.find((asset) => !beforeMediaIds.has(asset.id));

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
      expect(createdAdaptation).toMatchObject({
        workspaceId: "ws_demo",
        contentDraftId: "content_001",
        platform: "DOUYIN",
        title: adapted.title,
        body: adapted.content,
        checklist: ["短句优先", "每段不超过 20 秒", "保留风险检查提示"]
      });
      expect(createdBlocks.map((block) => block.type)).toEqual(["hook", "scene", "talking_points", "cta"]);
      expect(createdBlocks[0]).toMatchObject({
        metadata: {
          templateId: "template_douyin_talk_v1",
          label: "前三秒开场"
        }
      });
      expect(createdMediaAsset).toMatchObject({
        workspaceId: "ws_demo",
        contentDraftId: adapted.id,
        sourceType: "MOCK",
        metadata: {
          templateId: "template_douyin_talk_v1",
          platform: "DOUYIN"
        }
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "content.adapt",
        entityType: "PlatformAdaptation",
        entityId: createdAdaptation?.id,
        metadata: {
          sourceContentDraftId: "content_001",
          adaptationId: createdAdaptation?.id,
          adaptedContentDraftId: adapted.id,
          versionId: versions[0].id,
          templateId: "template_douyin_talk_v1",
          blockCount: 4,
          mediaAssetId: createdMediaAsset?.id,
          currentVersion: 1,
          platform: "DOUYIN"
        }
      });
    } finally {
      store.contentDrafts = store.contentDrafts.filter((draft) => beforeContentDraftIds.has(draft.id));
      store.contentVersions = store.contentVersions.filter((version) => beforeVersionIds.has(version.id));
      store.contentBlocks = store.contentBlocks.filter((block) => beforeBlockIds.has(block.id));
      store.mediaAssets = store.mediaAssets.filter((asset) => beforeMediaIds.has(asset.id));
      store.platformAdaptations = store.platformAdaptations.filter((adaptation) =>
        beforeAdaptationIds.has(adaptation.id)
      );
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });

  it("records reviews, risk checks, and publish plans as runtime governance history", async () => {
    const content = store.contentDrafts.find((item) => item.id === "content_001");
    expect(content).toBeTruthy();
    const original = {
      ...content!,
      riskItems: [...content!.riskItems]
    };
    const beforeReviewIds = new Set(store.contentReviews.map((review) => review.id));
    const beforeRiskIds = new Set(store.contentRiskChecks.map((check) => check.id));
    const beforePublishPlanIds = new Set(store.publishPlans.map((plan) => plan.id));
    const beforeCalendarIds = new Set(store.calendarItems.map((item) => item.id));
    const beforeAgentRunIds = new Set(store.agentRuns.map((run) => run.id));
    const beforeStepIds = new Set(store.agentSteps.map((step) => step.id));
    const beforeOutputIds = new Set(store.agentOutputs.map((output) => output.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const reviewed = reviewContent({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: "content_001",
        status: "APPROVED",
        comment: "测试审核通过"
      });
      const createdReview = store.contentReviews.find((review) => !beforeReviewIds.has(review.id));

      expect(reviewed.status).toBe("APPROVED");
      expect(createdReview).toMatchObject({
        workspaceId: "ws_demo",
        contentDraftId: "content_001",
        reviewerId: "user_owner",
        status: "APPROVED",
        comment: "测试审核通过"
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "content.review",
        entityType: "ContentReview",
        entityId: createdReview?.id,
        metadata: {
          contentDraftId: "content_001",
          status: "APPROVED",
          comment: "测试审核通过"
        }
      });

      const riskOutput = await riskCheckContent({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: "content_001"
      });
      const createdRiskCheck = store.contentRiskChecks.find((check) => !beforeRiskIds.has(check.id));
      const createdRiskRun = store.agentRuns.find(
        (run) => !beforeAgentRunIds.has(run.id) && run.agentType === "RISK"
      );

      expect(createdRiskCheck).toMatchObject({
        workspaceId: "ws_demo",
        contentDraftId: "content_001",
        riskLevel: riskOutput.riskLevel,
        riskItems: riskOutput.riskItems,
        rewriteSuggestions: riskOutput.rewriteSuggestions,
        sourceAgentRunId: createdRiskRun?.id
      });

      const scheduledAt = "2026-06-20T10:00:00.000Z";
      const calendarItem = scheduleContent({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: "content_001",
        platform: "WECHAT",
        scheduledAt
      });
      const createdPublishPlan = store.publishPlans.find((plan) => !beforePublishPlanIds.has(plan.id));

      expect(calendarItem).toMatchObject({
        contentDraftId: "content_001",
        platform: "WECHAT",
        scheduledAt,
        status: "PLANNED"
      });
      expect(createdPublishPlan).toMatchObject({
        workspaceId: "ws_demo",
        contentDraftId: "content_001",
        platform: "WECHAT",
        scheduledAt,
        ownerId: "user_owner",
        status: "PLANNED"
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "content.schedule",
        entityType: "PublishPlan",
        entityId: createdPublishPlan?.id,
        metadata: {
          contentDraftId: "content_001",
          calendarItemId: calendarItem.id,
          platform: "WECHAT",
          scheduledAt
        }
      });
    } finally {
      Object.assign(content!, original);
      store.contentReviews = store.contentReviews.filter((review) => beforeReviewIds.has(review.id));
      store.contentRiskChecks = store.contentRiskChecks.filter((check) => beforeRiskIds.has(check.id));
      store.publishPlans = store.publishPlans.filter((plan) => beforePublishPlanIds.has(plan.id));
      store.calendarItems = store.calendarItems.filter((item) => beforeCalendarIds.has(item.id));
      store.agentRuns = store.agentRuns.filter((run) => beforeAgentRunIds.has(run.id));
      store.agentSteps = store.agentSteps.filter((step) => beforeStepIds.has(step.id));
      store.agentOutputs = store.agentOutputs.filter((output) => beforeOutputIds.has(output.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });
});
