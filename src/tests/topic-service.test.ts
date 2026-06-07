import { describe, expect, it } from "vitest";
import { createTopic, generateBrief, getTopicRuntimeDetail, updateTopic } from "@/server/services/topic-service";
import { store } from "@/server/services/mock-store";

describe("topic service", () => {
  it("lists seeded topic runtime records as first-class data", () => {
    const detail = getTopicRuntimeDetail("ws_demo", "topic_001");

    expect(detail.topic.title).toContain("人设记忆");
    expect(detail.angles[0]).toMatchObject({
      workspaceId: "ws_demo",
      topicId: "topic_001"
    });
    expect(detail.scores[0]).toMatchObject({
      topicId: "topic_001",
      businessValue: expect.any(Number)
    });
    expect(detail.statusHistory.map((history) => history.toStatus)).toEqual(["PENDING", "ADOPTED"]);
    expect(detail.briefs[0]).toMatchObject({
      topicId: "topic_001",
      version: 1
    });
  });

  it("creates topic runtime artifacts and tracks later score and status changes", () => {
    const beforeTopicIds = new Set(store.topics.map((topic) => topic.id));
    const beforeBriefIds = new Set(store.topicBriefs.map((brief) => brief.id));
    const beforeAngleIds = new Set(store.topicAngles.map((angle) => angle.id));
    const beforeScoreIds = new Set(store.topicScores.map((score) => score.id));
    const beforeStatusHistoryIds = new Set(store.topicStatusHistories.map((history) => history.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const topic = createTopic({
        workspaceId: "ws_demo",
        userId: "user_owner",
        title: "人工录入的测试选题",
        angle: "用一个小团队复盘场景说明选题运行时记录的价值。",
        audience: "内容团队负责人",
        targetPlatforms: ["XIAOHONGSHU", "WECHAT"]
      });

      let detail = getTopicRuntimeDetail("ws_demo", topic.id);
      expect(detail.angles).toHaveLength(1);
      expect(detail.scores).toHaveLength(1);
      expect(detail.statusHistory).toHaveLength(1);
      expect(detail.statusHistory[0]).toMatchObject({
        toStatus: "PENDING",
        changedById: "user_owner"
      });

      updateTopic({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: topic.id,
        patch: {
          title: "更新后的测试选题",
          angle: "更新角度后同步主切入角度。",
          score: 86,
          status: "ADOPTED"
        }
      });

      detail = getTopicRuntimeDetail("ws_demo", topic.id);
      expect(detail.angles[0]).toMatchObject({
        title: "更新后的测试选题",
        hook: "更新角度后同步主切入角度。"
      });
      expect(detail.scores).toHaveLength(2);
      expect(detail.scores[0].rationale).toContain("人工更新选题总分");
      expect(detail.statusHistory.map((history) => history.toStatus)).toEqual(["PENDING", "ADOPTED"]);

      const brief = generateBrief({ workspaceId: "ws_demo", userId: "user_owner", topicId: topic.id });
      detail = getTopicRuntimeDetail("ws_demo", topic.id);

      expect(brief.version).toBe(1);
      expect(detail.topic.status).toBe("WRITING");
      expect(detail.briefs).toHaveLength(1);
      expect(detail.statusHistory.map((history) => history.toStatus)).toEqual(["PENDING", "ADOPTED", "WRITING"]);
      expect(store.auditLogs[0]).toMatchObject({
        action: "topic.generate_brief",
        metadata: {
          topicId: topic.id
        }
      });
    } finally {
      store.topics = store.topics.filter((topic) => beforeTopicIds.has(topic.id));
      store.topicBriefs = store.topicBriefs.filter((brief) => beforeBriefIds.has(brief.id));
      store.topicAngles = store.topicAngles.filter((angle) => beforeAngleIds.has(angle.id));
      store.topicScores = store.topicScores.filter((score) => beforeScoreIds.has(score.id));
      store.topicStatusHistories = store.topicStatusHistories.filter((history) => beforeStatusHistoryIds.has(history.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });
});
