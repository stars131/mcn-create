import { getPromptTemplate } from "@/server/ai/prompts/templates";
import { BaseAgent } from "@/server/agents/core/base-agent";
import { contentAgentInputSchema, contentAgentOutputSchema } from "@/server/agents/core/schemas";
import { recordContentVersion } from "@/server/services/content-version-service";
import { nextId, store } from "@/server/services/mock-store";
import type { AgentRun, ContentDraft } from "@/types/domain";
import type { z } from "zod";

type Input = z.infer<typeof contentAgentInputSchema>;
type Output = z.infer<typeof contentAgentOutputSchema>;

export class ContentAgent extends BaseAgent<Input, Output> {
  createdDraft?: ContentDraft;

  constructor(workspaceId: string, userId: string) {
    super("CONTENT", workspaceId, userId, contentAgentInputSchema, contentAgentOutputSchema);
  }

  async callModel(input: Input, run: AgentRun): Promise<Output> {
    const template = getPromptTemplate("content-generation");
    const topic = store.topics.find((item) => item.workspaceId === this.workspaceId && item.id === input.topicId);
    const brief = store.topicBriefs.find((item) => item.workspaceId === this.workspaceId && item.topicId === input.topicId);
    const persona = store.personas.find((item) => item.workspaceId === this.workspaceId && item.id === input.personaId);
    const title = topic?.title ?? "内容工作流升级";
    const seed: Output = {
      title: input.platform === "DOUYIN" ? `${title}，别再只靠灵感更新` : title,
      platform: input.platform,
      format: input.format,
      content: [
        `选题：${title}`,
        `人设语气：${persona?.voiceGuide ?? "直接、克制、可执行"}`,
        `核心 brief：${brief?.summary ?? topic?.angle ?? "围绕热点拆解可执行内容工作流。"}`,
        "正文：很多内容团队不是缺工具，而是缺一套能被审阅、复盘和协作的流程。先把热点、选题、人设、草稿、日历和数据放在同一个工作台，再让 AI 在每个节点提供建议。",
        `CTA：${input.cta}`
      ].join("\n\n"),
      suggestions: ["发布前补充案例来源", "保留人工审核记录", "生成抖音口播版和公众号长文版"],
      riskCheckRequired: true
    };

    const result = await this.aiProvider.generateStructuredObject({
      prompt: `${template.systemPrompt}\n${template.userPrompt}`,
      schema: contentAgentOutputSchema,
      context: {
        workspaceId: this.workspaceId,
        userId: this.userId,
        agentType: "CONTENT",
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
    const draft: ContentDraft = {
      id: nextId("content"),
      workspaceId: this.workspaceId,
      topicId: input.topicId,
      personaId: input.personaId,
      title: output.title,
      platform: output.platform,
      format: output.format,
      content: output.content,
      status: "DRAFT",
      currentVersion: 1,
      riskLevel: "LOW",
      riskItems: ["待执行风险检查"],
      sourceAgentRunId: run.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.createdDraft = draft;
    store.contentDrafts.unshift(draft);
    recordContentVersion({
      content: draft,
      createdById: this.userId,
      changeNote: "AI 生成内容初稿"
    });
  }
}
