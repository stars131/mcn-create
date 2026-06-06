import { getPromptTemplate } from "@/server/ai/prompts/templates";
import { BaseAgent } from "@/server/agents/core/base-agent";
import { analyticsAgentInputSchema, analyticsAgentOutputSchema } from "@/server/agents/core/schemas";
import { nextId, store } from "@/server/services/mock-store";
import type { AgentRun, AnalyticsReport, Topic } from "@/types/domain";
import type { z } from "zod";

type Input = z.infer<typeof analyticsAgentInputSchema>;
type Output = z.infer<typeof analyticsAgentOutputSchema>;

export class AnalyticsAgent extends BaseAgent<Input, Output> {
  constructor(workspaceId: string, userId: string) {
    super("ANALYTICS", workspaceId, userId, analyticsAgentInputSchema, analyticsAgentOutputSchema);
  }

  async callModel(input: Input, run: AgentRun): Promise<Output> {
    const template = getPromptTemplate("analytics-report");
    const records = store.metricRecords.filter((item) => item.workspaceId === this.workspaceId);
    const totalViews = records.reduce((sum, item) => sum + item.views, 0);
    const seed: Output = {
      title: `${input.period} 内容数据复盘`,
      summary: `本周期总曝光 ${totalViews.toLocaleString()}，内容工作流和人设一致性主题表现更稳。${input.commentSummary}`,
      anomalies: ["B 站脚本改写类内容低于基线，需要检查开头节奏", "晚间发布的小红书图文收藏率高于均值"],
      recommendations: ["新增 2 条人设记忆层案例", "将表现最好的热点沉淀为选题模板"],
      hypotheses: ["标题出现团队规模会提升点击", "加入风险检查清单会提升收藏"]
    };
    const result = await this.aiProvider.generateStructuredObject({
      prompt: `${template.systemPrompt}\n${template.userPrompt}`,
      schema: analyticsAgentOutputSchema,
      context: {
        workspaceId: this.workspaceId,
        userId: this.userId,
        agentType: "ANALYTICS",
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
    const report: AnalyticsReport = {
      id: nextId("report"),
      workspaceId: this.workspaceId,
      title: output.title,
      period: "自动生成周期",
      summary: output.summary,
      anomalies: output.anomalies,
      recommendations: output.recommendations,
      hypotheses: output.hypotheses,
      createdAt: new Date().toISOString()
    };
    store.analyticsReports.unshift(report);

    output.recommendations.forEach((recommendation) => {
      const topic: Topic = {
        id: nextId("topic"),
        workspaceId: this.workspaceId,
        title: `复盘建议：${recommendation}`,
        angle: "由数据分析 Agent 回流到选题池。",
        audience: "内容团队负责人",
        status: "PENDING",
        targetPlatforms: ["XIAOHONGSHU", "WECHAT"],
        score: 76,
        riskLevel: "LOW",
        outline: ["复盘结论", "选题假设", "执行计划"],
        sourceAgentRunId: run.id,
        createdAt: new Date().toISOString()
      };
      store.topics.unshift(topic);
    });
  }
}
