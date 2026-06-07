import { getPromptTemplate } from "@/server/ai/prompts/templates";
import { BaseAgent } from "@/server/agents/core/base-agent";
import { riskAgentInputSchema, riskAgentOutputSchema } from "@/server/agents/core/schemas";
import { nextId, store } from "@/server/services/mock-store";
import type { AgentRun } from "@/types/domain";
import type { z } from "zod";

type Input = z.infer<typeof riskAgentInputSchema>;
type Output = z.infer<typeof riskAgentOutputSchema>;

export class RiskCheckAgent extends BaseAgent<Input, Output> {
  constructor(workspaceId: string, userId: string) {
    super("RISK", workspaceId, userId, riskAgentInputSchema, riskAgentOutputSchema);
  }

  async callModel(input: Input, run: AgentRun): Promise<Output> {
    const template = getPromptTemplate("risk-check");
    const result = await this.aiProvider.classifyRisk({
      text: input.content,
      context: {
        workspaceId: this.workspaceId,
        userId: this.userId,
        agentType: "RISK",
        promptName: template.name
      }
    });
    run.model = result.model;
    run.tokenUsage = result.tokenUsage;
    run.costEstimate = result.costEstimate;
    run.latencyMs = result.latencyMs;
    return result.output;
  }

  async persistResult(output: Output, run: AgentRun) {
    const input = run.input as Input;
    if (!input.contentDraftId) {
      return;
    }

    const draft = store.contentDrafts.find(
      (item) => item.workspaceId === this.workspaceId && item.id === input.contentDraftId
    );
    if (draft) {
      const now = new Date().toISOString();
      draft.riskLevel = output.riskLevel;
      draft.riskItems = output.riskItems;
      draft.updatedAt = now;
      store.contentRiskChecks.unshift({
        id: nextId("content_risk"),
        workspaceId: this.workspaceId,
        contentDraftId: draft.id,
        riskLevel: output.riskLevel,
        riskItems: output.riskItems,
        rewriteSuggestions: output.rewriteSuggestions,
        sourceAgentRunId: run.id,
        createdAt: now,
        updatedAt: now
      });
    }
  }
}
