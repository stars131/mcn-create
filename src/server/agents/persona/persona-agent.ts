import { getPromptTemplate } from "@/server/ai/prompts/templates";
import { BaseAgent } from "@/server/agents/core/base-agent";
import { personaAgentInputSchema, personaAgentOutputSchema } from "@/server/agents/core/schemas";
import { store } from "@/server/services/mock-store";
import type { AgentRun } from "@/types/domain";
import type { z } from "zod";

type Input = z.infer<typeof personaAgentInputSchema>;
type Output = z.infer<typeof personaAgentOutputSchema>;

export class PersonaAgent extends BaseAgent<Input, Output> {
  constructor(workspaceId: string, userId: string) {
    super("PERSONA", workspaceId, userId, personaAgentInputSchema, personaAgentOutputSchema);
  }

  async callModel(input: Input, run: AgentRun): Promise<Output> {
    const template = getPromptTemplate("persona-extraction");
    const seed: Output = {
      voiceGuide: "直接、克制、以流程和证据为核心；先界定问题，再给判断标准。",
      forbiddenExpressions: ["一键爆款", "全自动代运营", "稳赚", "绕过平台限制"],
      highFrequencyWords: ["工作流", "人设记忆", "复盘", "审计", "合规数据"],
      structurePreferences: ["问题场景开头", "三段式流程", "结尾给检查清单"],
      audiencePortraits: ["职业 IP 主理人", "小品牌内容负责人", "小型 MCN 编辑"],
      versionSummary: `根据导入内容提取 ${input.importedContent.slice(0, 18)}... 的表达偏好`
    };

    const result = await this.aiProvider.generateStructuredObject({
      prompt: `${template.systemPrompt}\n${template.userPrompt}\n${input.brandNotes}`,
      schema: personaAgentOutputSchema,
      context: {
        workspaceId: this.workspaceId,
        userId: this.userId,
        agentType: "PERSONA",
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

  async persistResult(output: Output) {
    const persona = store.personas.find((item) => item.workspaceId === this.workspaceId);
    if (persona) {
      persona.voiceGuide = output.voiceGuide;
      persona.forbiddenExpressions = output.forbiddenExpressions;
      persona.highFrequencyWords = output.highFrequencyWords;
      persona.targetAudiences = output.audiencePortraits;
      persona.version += 1;
      persona.reviewStatus = "REVIEWING";
      persona.updatedAt = new Date().toISOString();
    }
  }
}
