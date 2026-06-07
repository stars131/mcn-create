import { ContentAgent, RiskCheckAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import {
  listContentVersions as listStoredContentVersions,
  recordContentVersion
} from "@/server/services/content-version-service";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { ContentDraft, ContentReview, ContentStatus, Platform, PlatformAdaptation, PublishPlan } from "@/types/domain";

export function listContents(workspaceId: string) {
  return getWorkspaceScoped(store.contentDrafts, workspaceId).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getContent(workspaceId: string, id: string) {
  const content = store.contentDrafts.find((item) => item.workspaceId === workspaceId && item.id === id);
  if (!content) {
    throw new ApiError("内容草稿不存在", 404);
  }
  return content;
}

export function listContentVersions(workspaceId: string, id: string) {
  getContent(workspaceId, id);
  return listStoredContentVersions(workspaceId, id);
}

export function listContentRiskChecks(workspaceId: string, id: string) {
  getContent(workspaceId, id);
  return store.contentRiskChecks
    .filter((check) => check.workspaceId === workspaceId && check.contentDraftId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function listContentReviews(workspaceId: string, id: string) {
  getContent(workspaceId, id);
  return store.contentReviews
    .filter((review) => review.workspaceId === workspaceId && review.contentDraftId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function listPlatformAdaptations(workspaceId: string, id: string) {
  getContent(workspaceId, id);
  return store.platformAdaptations
    .filter((adaptation) => adaptation.workspaceId === workspaceId && adaptation.contentDraftId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function listPublishPlans(workspaceId: string, id: string) {
  getContent(workspaceId, id);
  return store.publishPlans
    .filter((plan) => plan.workspaceId === workspaceId && plan.contentDraftId === id)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

export async function generateContent(input: {
  workspaceId: string;
  userId: string;
  topicId: string;
  personaId?: string;
  platform?: Platform;
  format?: string;
  cta?: string;
}) {
  const agent = new ContentAgent(input.workspaceId, input.userId);
  await agent.run({
    topicId: input.topicId,
    personaId: input.personaId ?? "persona_001",
    platform: input.platform ?? "XIAOHONGSHU",
    format: input.format ?? "图文",
    cta: input.cta ?? "引导读者领取工作流清单"
  });
  if (!agent.createdDraft) {
    throw new ApiError("内容草稿生成失败", 500);
  }
  return agent.createdDraft;
}

export function updateContent(input: {
  workspaceId: string;
  userId: string;
  id: string;
  patch: Partial<Pick<ContentDraft, "title" | "content" | "status">>;
}) {
  const content = getContent(input.workspaceId, input.id);
  const previousVersion = content.currentVersion;
  Object.assign(content, input.patch, {
    currentVersion: content.currentVersion + 1,
    updatedAt: new Date().toISOString()
  });
  const version = recordContentVersion({
    content,
    createdById: input.userId,
    changeNote: "人工编辑内容草稿"
  });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "content.update",
    entityType: "ContentDraft",
    entityId: content.id,
    summary: `更新内容草稿：${content.title}`,
    metadata: {
      versionId: version.id,
      previousVersion,
      nextVersion: content.currentVersion
    }
  });
  return content;
}

export function adaptContent(input: { workspaceId: string; userId: string; id: string; platform: Platform }) {
  const content = getContent(input.workspaceId, input.id);
  const adapted: ContentDraft = {
    ...content,
    id: nextId("content"),
    platform: input.platform,
    title: `${content.title}（${input.platform} 版）`,
    format: input.platform === "DOUYIN" ? "口播稿" : input.platform === "WECHAT" ? "长文" : content.format,
    content: `${content.content}\n\n平台适配：根据 ${input.platform} 的内容结构调整开头、节奏和 CTA。`,
    status: "DRAFT" as ContentStatus,
    currentVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  store.contentDrafts.unshift(adapted);
  const now = new Date().toISOString();
  const adaptation: PlatformAdaptation = {
    id: nextId("adaptation"),
    workspaceId: input.workspaceId,
    contentDraftId: content.id,
    platform: input.platform,
    title: adapted.title,
    body: adapted.content,
    checklist: ["确认平台开场节奏", "复核 CTA 与禁用表达", "保留人工审核记录"],
    createdAt: now,
    updatedAt: now
  };
  store.platformAdaptations.unshift(adaptation);
  const version = recordContentVersion({
    content: adapted,
    createdById: input.userId,
    changeNote: `平台适配初稿：${input.platform}`
  });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "content.adapt",
    entityType: "PlatformAdaptation",
    entityId: adaptation.id,
    summary: `生成平台适配版本：${adapted.title}`,
    metadata: {
      sourceContentDraftId: content.id,
      adaptationId: adaptation.id,
      adaptedContentDraftId: adapted.id,
      versionId: version.id,
      currentVersion: adapted.currentVersion,
      platform: input.platform
    }
  });
  return adapted;
}

export async function riskCheckContent(input: { workspaceId: string; userId: string; id: string }) {
  const content = getContent(input.workspaceId, input.id);
  const agent = new RiskCheckAgent(input.workspaceId, input.userId);
  return agent.run({ contentDraftId: content.id, content: content.content });
}

export function reviewContent(input: {
  workspaceId: string;
  userId: string;
  id: string;
  status: Extract<ContentStatus, "APPROVED" | "REJECTED" | "IN_REVIEW">;
  comment?: string;
}) {
  const content = getContent(input.workspaceId, input.id);
  const now = new Date().toISOString();
  content.status = input.status;
  content.updatedAt = now;
  const review: ContentReview = {
    id: nextId("content_review"),
    workspaceId: input.workspaceId,
    contentDraftId: content.id,
    reviewerId: input.userId,
    status: input.status,
    comment: input.comment,
    createdAt: now,
    updatedAt: now
  };
  store.contentReviews.unshift(review);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "content.review",
    entityType: "ContentReview",
    entityId: review.id,
    summary: `内容审核状态变更为 ${input.status}`,
    metadata: {
      contentDraftId: content.id,
      status: input.status,
      comment: input.comment
    }
  });
  return content;
}

export function scheduleContent(input: {
  workspaceId: string;
  userId: string;
  id: string;
  scheduledAt?: string;
  platform?: Platform;
}) {
  const content = getContent(input.workspaceId, input.id);
  const now = new Date().toISOString();
  const scheduledAt = input.scheduledAt ?? new Date(Date.now() + 86400000).toISOString();
  const platform = input.platform ?? content.platform;
  const publishPlan: PublishPlan = {
    id: nextId("publish_plan"),
    workspaceId: input.workspaceId,
    contentDraftId: content.id,
    platform,
    scheduledAt,
    ownerId: input.userId,
    status: "PLANNED",
    createdAt: now,
    updatedAt: now
  };
  const item = {
    id: nextId("cal"),
    workspaceId: input.workspaceId,
    topicId: content.topicId,
    contentDraftId: content.id,
    title: content.title,
    platform,
    scheduledAt,
    ownerName: "林澈",
    status: "PLANNED" as const
  };
  content.status = "SCHEDULED";
  content.updatedAt = now;
  store.publishPlans.unshift(publishPlan);
  store.calendarItems.unshift(item);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "content.schedule",
    entityType: "PublishPlan",
    entityId: publishPlan.id,
    summary: `内容加入日历：${content.title}`,
    metadata: {
      contentDraftId: content.id,
      calendarItemId: item.id,
      platform,
      scheduledAt
    }
  });
  return item;
}
