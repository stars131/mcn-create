import { TopicAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { Platform, Topic, TopicStatus } from "@/types/domain";

export function listTopics(workspaceId: string, status?: TopicStatus | null) {
  return getWorkspaceScoped(store.topics, workspaceId)
    .filter((topic) => (status ? topic.status === status : true))
    .sort((a, b) => b.score - a.score);
}

export function getTopic(workspaceId: string, id: string) {
  const topic = store.topics.find((item) => item.workspaceId === workspaceId && item.id === id);
  if (!topic) {
    throw new ApiError("选题不存在", 404);
  }
  return topic;
}

export function createTopic(input: {
  workspaceId: string;
  userId: string;
  title: string;
  angle: string;
  audience: string;
  targetPlatforms: Platform[];
}) {
  const topic: Topic = {
    id: nextId("topic"),
    workspaceId: input.workspaceId,
    title: input.title,
    angle: input.angle,
    audience: input.audience,
    status: "PENDING",
    targetPlatforms: input.targetPlatforms,
    score: 72,
    riskLevel: "LOW",
    outline: ["背景", "观点", "案例", "行动建议"],
    createdAt: new Date().toISOString()
  };
  store.topics.unshift(topic);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "topic.create",
    entityType: "Topic",
    entityId: topic.id,
    summary: `创建选题：${topic.title}`
  });
  return topic;
}

export function updateTopic(input: {
  workspaceId: string;
  userId: string;
  id: string;
  patch: Partial<Pick<Topic, "status" | "title" | "angle" | "score">>;
}) {
  const topic = getTopic(input.workspaceId, input.id);
  Object.assign(topic, input.patch);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "topic.update",
    entityType: "Topic",
    entityId: topic.id,
    summary: `更新选题：${topic.title}`
  });
  return topic;
}

export async function generateTopicsFromHotspot(input: {
  workspaceId: string;
  userId: string;
  hotItemId: string;
  personaId?: string;
}) {
  const agent = new TopicAgent(input.workspaceId, input.userId);
  return agent.run({
    hotItemId: input.hotItemId,
    personaId: input.personaId ?? "persona_001",
    businessGoal: "获取内容工作流线索",
    forbiddenTopics: ["医疗建议", "金融收益承诺", "法律结论", "时政判断"],
    targetPlatforms: ["XIAOHONGSHU", "DOUYIN", "WECHAT"]
  });
}

export function generateBrief(input: { workspaceId: string; userId: string; topicId: string }) {
  const topic = getTopic(input.workspaceId, input.topicId);
  const existing = store.topicBriefs.filter((brief) => brief.workspaceId === input.workspaceId && brief.topicId === topic.id);
  const brief = {
    id: nextId("brief"),
    workspaceId: input.workspaceId,
    topicId: topic.id,
    version: existing.length + 1,
    summary: `围绕「${topic.title}」输出结构化内容 brief，重点覆盖：${topic.angle}`,
    outline: topic.outline.length > 0 ? topic.outline : ["开场冲突", "观点拆解", "案例", "CTA"],
    cta: "引导读者领取内容工作流检查表",
    materialNotes: "使用授权数据、用户上传素材或 mock 数据；发布前补充事实来源。",
    createdAt: new Date().toISOString()
  };
  store.topicBriefs.unshift(brief);
  topic.status = "WRITING";
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "topic.generate_brief",
    entityType: "TopicBrief",
    entityId: brief.id,
    summary: `生成内容 brief：${topic.title}`
  });
  return brief;
}

export function addTopicToCalendar(input: { workspaceId: string; userId: string; topicId: string; platform?: Platform }) {
  const topic = getTopic(input.workspaceId, input.topicId);
  const item = {
    id: nextId("cal"),
    workspaceId: input.workspaceId,
    topicId: topic.id,
    title: topic.title,
    platform: input.platform ?? topic.targetPlatforms[0] ?? "XIAOHONGSHU",
    scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    ownerName: "林澈",
    status: "PLANNED" as const
  };
  store.calendarItems.unshift(item);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "topic.add_to_calendar",
    entityType: "TopicCalendarItem",
    entityId: item.id,
    summary: `选题加入日历：${topic.title}`
  });
  return item;
}
