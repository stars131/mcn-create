import { ContentAgent, RiskCheckAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { ContentDraft, ContentStatus, Platform } from "@/types/domain";

export function listContents(workspaceId: string) {
  return getWorkspaceScoped(store.contentDrafts, workspaceId).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getContent(workspaceId: string, id: string) {
  const content = store.contentDrafts.find((item) => item.workspaceId === workspaceId && item.id === id);
  if (!content) {
    throw new Error("内容草稿不存在");
  }
  return content;
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
    throw new Error("内容草稿生成失败");
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
  Object.assign(content, input.patch, {
    currentVersion: content.currentVersion + 1,
    updatedAt: new Date().toISOString()
  });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "content.update",
    entityType: "ContentDraft",
    entityId: content.id,
    summary: `更新内容草稿：${content.title}`
  });
  return content;
}

export function adaptContent(input: { workspaceId: string; userId: string; id: string; platform: Platform }) {
  const content = getContent(input.workspaceId, input.id);
  const adapted = {
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
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "content.adapt",
    entityType: "PlatformAdaptation",
    entityId: adapted.id,
    summary: `生成平台适配版本：${adapted.title}`
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
  content.status = input.status;
  content.updatedAt = new Date().toISOString();
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "content.review",
    entityType: "ContentReview",
    entityId: content.id,
    summary: `内容审核状态变更为 ${input.status}`,
    metadata: { comment: input.comment }
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
  const item = {
    id: nextId("cal"),
    workspaceId: input.workspaceId,
    topicId: content.topicId,
    contentDraftId: content.id,
    title: content.title,
    platform: input.platform ?? content.platform,
    scheduledAt: input.scheduledAt ?? new Date(Date.now() + 86400000).toISOString(),
    ownerName: "林澈",
    status: "PLANNED" as const
  };
  content.status = "SCHEDULED";
  content.updatedAt = new Date().toISOString();
  store.calendarItems.unshift(item);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "content.schedule",
    entityType: "PublishPlan",
    entityId: item.id,
    summary: `内容加入日历：${content.title}`
  });
  return item;
}
