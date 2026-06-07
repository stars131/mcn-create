import { nextId, store } from "@/server/services/mock-store";
import type { Topic, TopicAngle, TopicScore, TopicStatus, TopicStatusHistory } from "@/types/domain";

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function deriveTopicScore(topic: Topic) {
  const riskDifficulty = topic.riskLevel === "HIGH" ? 72 : topic.riskLevel === "MEDIUM" ? 54 : 34;
  const platformLoad = Math.max(0, topic.targetPlatforms.length - 1) * 5;

  return {
    relevance: clampScore(topic.score + 4),
    competition: clampScore(68 - topic.score * 0.25 + platformLoad),
    businessValue: clampScore(topic.score - 2),
    executionDifficulty: clampScore(riskDifficulty + platformLoad)
  };
}

function defaultScoreRationale(topic: Topic) {
  return `围绕「${topic.title}」评估：人设相关度 ${topic.score} 分，平台数量 ${topic.targetPlatforms.length} 个，风险等级 ${topic.riskLevel}。`;
}

export function createTopicAngle(
  topic: Topic,
  input: { title?: string; hook?: string; outline?: string[]; now?: string } = {}
): TopicAngle {
  const timestamp = input.now ?? new Date().toISOString();
  const record: TopicAngle = {
    id: nextId("topic_angle"),
    workspaceId: topic.workspaceId,
    topicId: topic.id,
    title: input.title ?? topic.title,
    hook: input.hook ?? topic.angle,
    outline: [...(input.outline ?? topic.outline)],
    createdAt: timestamp,
    updatedAt: timestamp
  };
  store.topicAngles.unshift(record);
  return record;
}

export function upsertPrimaryTopicAngle(
  topic: Topic,
  input: { title?: string; hook?: string; outline?: string[]; now?: string } = {}
) {
  const existing = store.topicAngles.find((item) => item.workspaceId === topic.workspaceId && item.topicId === topic.id);
  if (!existing) {
    return createTopicAngle(topic, input);
  }

  existing.title = input.title ?? topic.title;
  existing.hook = input.hook ?? topic.angle;
  existing.outline = [...(input.outline ?? topic.outline)];
  existing.updatedAt = input.now ?? new Date().toISOString();
  return existing;
}

export function createTopicScore(
  topic: Topic,
  input: { rationale?: string; now?: string } = {}
): TopicScore {
  const timestamp = input.now ?? new Date().toISOString();
  const record: TopicScore = {
    id: nextId("topic_score"),
    workspaceId: topic.workspaceId,
    topicId: topic.id,
    ...deriveTopicScore(topic),
    rationale: input.rationale ?? defaultScoreRationale(topic),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  store.topicScores.unshift(record);
  return record;
}

export function recordTopicStatusHistory(input: {
  topic: Topic;
  fromStatus?: TopicStatus;
  toStatus: TopicStatus;
  changedById?: string;
  reason?: string;
  now?: string;
}): TopicStatusHistory {
  let timestamp = input.now ?? new Date().toISOString();
  const latestForTopic = store.topicStatusHistories.find(
    (history) => history.workspaceId === input.topic.workspaceId && history.topicId === input.topic.id
  );
  if (latestForTopic && Date.parse(timestamp) <= Date.parse(latestForTopic.createdAt)) {
    timestamp = new Date(Date.parse(latestForTopic.createdAt) + 1).toISOString();
  }
  const record: TopicStatusHistory = {
    id: nextId("topic_status"),
    workspaceId: input.topic.workspaceId,
    topicId: input.topic.id,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    changedById: input.changedById,
    reason: input.reason,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  store.topicStatusHistories.unshift(record);
  return record;
}

export function setTopicStatus(
  topic: Topic,
  toStatus: TopicStatus,
  input: { changedById?: string; reason?: string; now?: string } = {}
) {
  if (topic.status === toStatus) {
    return undefined;
  }

  const fromStatus = topic.status;
  topic.status = toStatus;
  return recordTopicStatusHistory({
    topic,
    fromStatus,
    toStatus,
    changedById: input.changedById,
    reason: input.reason,
    now: input.now
  });
}

export function createInitialTopicRuntimeRecords(
  topic: Topic,
  input: { userId?: string; reason?: string; now?: string; scoreRationale?: string } = {}
) {
  const timestamp = input.now ?? new Date().toISOString();
  return {
    angle: createTopicAngle(topic, { now: timestamp }),
    score: createTopicScore(topic, { now: timestamp, rationale: input.scoreRationale }),
    statusHistory: recordTopicStatusHistory({
      topic,
      toStatus: topic.status,
      changedById: input.userId,
      reason: input.reason ?? "创建选题候选",
      now: timestamp
    })
  };
}
