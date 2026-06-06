import { getPromptTemplate } from "@/server/ai/prompts/templates";
import { BaseAgent } from "@/server/agents/core/base-agent";
import {
  hotspotAgentInputSchema,
  hotspotAgentOutputSchema
} from "@/server/agents/core/schemas";
import { mockPlatformAdapter } from "@/server/platforms/mock/mock-platform-adapter";
import { store } from "@/server/services/mock-store";
import type { AgentRun } from "@/types/domain";
import type { z } from "zod";

type Input = z.infer<typeof hotspotAgentInputSchema>;
type Output = z.infer<typeof hotspotAgentOutputSchema>;

export class HotspotAgent extends BaseAgent<Input, Output> {
  constructor(workspaceId: string, userId: string) {
    super("HOTSPOT", workspaceId, userId, hotspotAgentInputSchema, hotspotAgentOutputSchema);
  }

  async callModel(input: Input, run: AgentRun): Promise<Output> {
    const template = getPromptTemplate("hotspot-summary");
    const items = await mockPlatformAdapter.fetchHotspots({
      workspaceId: this.workspaceId,
      platforms: input.platforms,
      industry: input.industry,
      keyword: input.keyword,
      window: input.window
    });

    const seed: Output = {
      clusters: store.hotClusters
        .filter((cluster) => cluster.workspaceId === this.workspaceId)
        .map((cluster) => ({
          name: cluster.name,
          summary: cluster.summary,
          trendReason: cluster.trendReason,
          heatScore: cluster.heatScore,
          growthScore: cluster.growthScore,
          riskLevel: cluster.riskLevel,
          suggestedAngles: cluster.suggestedAngles
        })),
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        platform: item.platform,
        heatScore: item.heatScore,
        growthScore: item.growthScore,
        riskLevel: item.riskLevel,
        suggestedAngles: item.suggestedAngles
      }))
    };

    const result = await this.aiProvider.generateStructuredObject({
      prompt: `${template.systemPrompt}\n${template.userPrompt}`,
      schema: hotspotAgentOutputSchema,
      context: {
        workspaceId: this.workspaceId,
        userId: this.userId,
        agentType: "HOTSPOT",
        promptName: template.name
      },
      seed
    });
    run.model = result.model;
    run.tokenUsage = result.tokenUsage;
    run.costEstimate = result.costEstimate;
    run.latencyMs = result.latencyMs;
    return result.output;
  }
}
