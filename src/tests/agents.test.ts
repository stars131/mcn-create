import { describe, expect, it } from "vitest";
import { TopicAgent, RiskCheckAgent } from "@/server/agents";
import { generateContent, listContentVersions } from "@/server/services/content-service";
import { store } from "@/server/services/mock-store";

describe("Agent framework", () => {
  it("generates structured topics from a hotspot", async () => {
    const before = store.topics.length;
    const agent = new TopicAgent("ws_demo", "user_owner");
    const output = await agent.run({
      hotItemId: "hot_001",
      personaId: "persona_001",
      businessGoal: "验证测试",
      forbiddenTopics: [],
      targetPlatforms: ["XIAOHONGSHU"]
    });

    expect(output.topics.length).toBeGreaterThan(0);
    expect(store.topics.length).toBeGreaterThan(before);
  });

  it("classifies risky content with structured output", async () => {
    const agent = new RiskCheckAgent("ws_demo", "user_owner");
    const output = await agent.run({
      content: "不要承诺稳赚，也不要绕过平台限制。",
      contentDraftId: "content_001"
    });

    expect(output.riskLevel).toBe("HIGH");
    expect(output.riskItems.length).toBeGreaterThan(0);
  });

  it("returns the persisted content draft from content generation", async () => {
    const beforeAgentRunIds = new Set(store.agentRuns.map((run) => run.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));
    let draftId: string | undefined;

    try {
      const draft = await generateContent({
        workspaceId: "ws_demo",
        userId: "user_owner",
        topicId: "topic_001",
        personaId: "persona_001",
        platform: "XIAOHONGSHU",
        format: "图文"
      });
      draftId = draft.id;
      const versions = listContentVersions("ws_demo", draft.id);

      expect(draft.id).toMatch(/^content_/);
      expect(draft.sourceAgentRunId).toBeTruthy();
      expect(store.contentDrafts.some((item) => item.id === draft.id)).toBe(true);
      expect(versions).toHaveLength(1);
      expect(versions[0]).toMatchObject({
        contentDraftId: draft.id,
        version: 1,
        content: draft.content,
        changeNote: "AI 生成内容初稿",
        createdById: "user_owner"
      });
    } finally {
      if (draftId) {
        store.contentDrafts = store.contentDrafts.filter((item) => item.id !== draftId);
        store.contentVersions = store.contentVersions.filter((version) => version.contentDraftId !== draftId);
      }
      store.agentRuns = store.agentRuns.filter((run) => beforeAgentRunIds.has(run.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });
});
