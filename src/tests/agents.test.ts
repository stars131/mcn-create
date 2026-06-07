import { describe, expect, it } from "vitest";
import { TopicAgent, RiskCheckAgent } from "@/server/agents";
import { generateContent, listContentBlocks, listContentMediaAssets, listContentVersions } from "@/server/services/content-service";
import { store } from "@/server/services/mock-store";

describe("Agent framework", () => {
  it("generates structured topics from a hotspot", async () => {
    const beforeTopicIds = new Set(store.topics.map((topic) => topic.id));
    const beforeAgentRunIds = new Set(store.agentRuns.map((run) => run.id));
    const beforeStepIds = new Set(store.agentSteps.map((step) => step.id));
    const beforeOutputIds = new Set(store.agentOutputs.map((output) => output.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const agent = new TopicAgent("ws_demo", "user_owner");
      const output = await agent.run({
        hotItemId: "hot_001",
        personaId: "persona_001",
        businessGoal: "验证测试",
        forbiddenTopics: [],
        targetPlatforms: ["XIAOHONGSHU"]
      });

      expect(output.topics.length).toBeGreaterThan(0);
      expect(store.topics.length).toBeGreaterThan(beforeTopicIds.size);
    } finally {
      store.topics = store.topics.filter((topic) => beforeTopicIds.has(topic.id));
      store.agentRuns = store.agentRuns.filter((run) => beforeAgentRunIds.has(run.id));
      store.agentSteps = store.agentSteps.filter((step) => beforeStepIds.has(step.id));
      store.agentOutputs = store.agentOutputs.filter((output) => beforeOutputIds.has(output.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });

  it("classifies risky content with structured output", async () => {
    const content = store.contentDrafts.find((item) => item.id === "content_001");
    expect(content).toBeTruthy();
    const original = {
      ...content!,
      riskItems: [...content!.riskItems]
    };
    const beforeRiskIds = new Set(store.contentRiskChecks.map((check) => check.id));
    const beforeAgentRunIds = new Set(store.agentRuns.map((run) => run.id));
    const beforeStepIds = new Set(store.agentSteps.map((step) => step.id));
    const beforeOutputIds = new Set(store.agentOutputs.map((output) => output.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const agent = new RiskCheckAgent("ws_demo", "user_owner");
      const output = await agent.run({
        content: "不要承诺稳赚，也不要绕过平台限制。",
        contentDraftId: "content_001"
      });
      const createdRun = store.agentRuns.find((run) => !beforeAgentRunIds.has(run.id) && run.agentType === "RISK");
      const createdRiskCheck = store.contentRiskChecks.find((check) => !beforeRiskIds.has(check.id));

      expect(output.riskLevel).toBe("HIGH");
      expect(output.riskItems.length).toBeGreaterThan(0);
      expect(createdRiskCheck).toMatchObject({
        contentDraftId: "content_001",
        riskLevel: "HIGH",
        riskItems: output.riskItems,
        rewriteSuggestions: output.rewriteSuggestions,
        sourceAgentRunId: createdRun?.id
      });
    } finally {
      Object.assign(content!, original);
      store.contentRiskChecks = store.contentRiskChecks.filter((check) => beforeRiskIds.has(check.id));
      store.agentRuns = store.agentRuns.filter((run) => beforeAgentRunIds.has(run.id));
      store.agentSteps = store.agentSteps.filter((step) => beforeStepIds.has(step.id));
      store.agentOutputs = store.agentOutputs.filter((output) => beforeOutputIds.has(output.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });

  it("returns the persisted content draft from content generation", async () => {
    const beforeAgentRunIds = new Set(store.agentRuns.map((run) => run.id));
    const beforeStepIds = new Set(store.agentSteps.map((step) => step.id));
    const beforeOutputIds = new Set(store.agentOutputs.map((output) => output.id));
    const beforeBlockIds = new Set(store.contentBlocks.map((block) => block.id));
    const beforeMediaIds = new Set(store.mediaAssets.map((asset) => asset.id));
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
      const blocks = listContentBlocks("ws_demo", draft.id);
      const mediaAssets = listContentMediaAssets("ws_demo", draft.id);

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
      expect(blocks.map((block) => block.type)).toEqual(["hook", "persona", "brief", "body", "cta"]);
      expect(blocks[0]).toMatchObject({
        metadata: {
          templateId: "template_xhs_image_text_v1",
          label: "开场钩子"
        }
      });
      expect(mediaAssets[0]).toMatchObject({
        contentDraftId: draft.id,
        sourceType: "MOCK",
        metadata: {
          templateId: "template_xhs_image_text_v1",
          platform: "XIAOHONGSHU"
        }
      });
    } finally {
      if (draftId) {
        store.contentDrafts = store.contentDrafts.filter((item) => item.id !== draftId);
        store.contentVersions = store.contentVersions.filter((version) => version.contentDraftId !== draftId);
      }
      store.contentBlocks = store.contentBlocks.filter((block) => beforeBlockIds.has(block.id));
      store.mediaAssets = store.mediaAssets.filter((asset) => beforeMediaIds.has(asset.id));
      store.agentRuns = store.agentRuns.filter((run) => beforeAgentRunIds.has(run.id));
      store.agentSteps = store.agentSteps.filter((step) => beforeStepIds.has(step.id));
      store.agentOutputs = store.agentOutputs.filter((output) => beforeOutputIds.has(output.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });
});
