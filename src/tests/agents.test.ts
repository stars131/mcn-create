import { describe, expect, it } from "vitest";
import { TopicAgent, RiskCheckAgent } from "@/server/agents";
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
});
