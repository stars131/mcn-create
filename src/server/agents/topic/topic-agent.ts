import { getPromptTemplate } from "@/server/ai/prompts/templates";
import { BaseAgent } from "@/server/agents/core/base-agent";
import { topicAgentInputSchema, topicAgentOutputSchema } from "@/server/agents/core/schemas";
import { nextId, store } from "@/server/services/mock-store";
import { createInitialTopicRuntimeRecords } from "@/server/services/topic-runtime";
import type { AgentRun, Topic } from "@/types/domain";
import type { z } from "zod";

type Input = z.infer<typeof topicAgentInputSchema>;
type Output = z.infer<typeof topicAgentOutputSchema>;

export class TopicAgent extends BaseAgent<Input, Output> {
  constructor(workspaceId: string, userId: string) {
    super("TOPIC", workspaceId, userId, topicAgentInputSchema, topicAgentOutputSchema);
  }

  async callModel(input: Input, run: AgentRun): Promise<Output> {
    const template = getPromptTemplate("topic-generation");
    const hotItem = store.hotItems.find((item) => item.workspaceId === this.workspaceId && item.id === input.hotItemId);
    const persona = store.personas.find((item) => item.workspaceId === this.workspaceId && item.id === input.personaId);
    const baseTitle = hotItem?.title ?? "内容团队工作流升级";
    const voice = persona?.name ?? "务实型内容增长顾问";
    const seed: Output = {
      topics: [
        {
          title: `从「${baseTitle}」拆出一套可复用内容工作流`,
          angle: `用 ${voice} 的语气解释热点背后的团队协作问题，并给出可执行流程。`,
          audience: "小品牌内容负责人和职业 IP 团队",
          targetPlatforms: input.targetPlatforms,
          score: 88,
          riskLevel: "LOW",
          outline: ["热点背景", "团队常见卡点", "工作流拆解", "人工审核与复盘"]
        },
        {
          title: `这类热点为什么不能直接追：先过人设和风险两道门`,
          angle: "强调合规来源、禁用表达和平台适配，避免把 AI 当成全自动代运营。",
          audience: "小型 MCN 编辑与运营负责人",
          targetPlatforms: input.targetPlatforms,
          score: 81,
          riskLevel: "LOW",
          outline: ["直接追热点的风险", "人设匹配规则", "风险检查清单", "加入日历排期"]
        }
      ]
    };

    const result = await this.aiProvider.generateStructuredObject({
      prompt: `${template.systemPrompt}\n${template.userPrompt}`,
      schema: topicAgentOutputSchema,
      context: {
        workspaceId: this.workspaceId,
        userId: this.userId,
        agentType: "TOPIC",
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

  async persistResult(output: Output, run: AgentRun) {
    const input = run.input as Input;
    output.topics.forEach((topic) => {
      const createdAt = new Date().toISOString();
      const record: Topic = {
        id: nextId("topic"),
        workspaceId: this.workspaceId,
        title: topic.title,
        angle: topic.angle,
        audience: topic.audience,
        status: "PENDING",
        targetPlatforms: topic.targetPlatforms,
        score: topic.score,
        hotItemId: input.hotItemId,
        personaId: input.personaId,
        riskLevel: topic.riskLevel,
        outline: topic.outline,
        sourceAgentRunId: run.id,
        createdAt
      } as Topic;
      store.topics.unshift(record);
      createInitialTopicRuntimeRecords(record, {
        userId: this.userId,
        reason: "Topic Agent 生成候选选题",
        now: createdAt,
        scoreRationale: "Topic Agent 基于热点、人设、业务目标和平台适配生成评分拆解。"
      });
    });
  }
}
