import { getPromptTemplate } from "@/server/ai/prompts/templates";
import { BaseAgent } from "@/server/agents/core/base-agent";
import { analyticsAgentInputSchema, analyticsAgentOutputSchema } from "@/server/agents/core/schemas";
import { nextId, store } from "@/server/services/mock-store";
import type { ABHypothesis, AgentRun, AnalyticsReport, CommentInsight, Experiment, Recommendation } from "@/types/domain";
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
    const now = new Date().toISOString();
    const report: AnalyticsReport = {
      id: nextId("report"),
      workspaceId: this.workspaceId,
      title: output.title,
      period: "自动生成周期",
      summary: output.summary,
      anomalies: output.anomalies,
      recommendations: output.recommendations,
      hypotheses: output.hypotheses,
      sourceAgentRunId: run.id,
      createdAt: now
    };
    store.analyticsReports.unshift(report);

    const strongestCommentRecord = store.metricRecords
      .filter((record) => record.workspaceId === this.workspaceId)
      .sort((left, right) => right.comments - left.comments)[0];

    const commentInsight: CommentInsight = {
      id: nextId("comment_insight"),
      workspaceId: this.workspaceId,
      metricRecordId: strongestCommentRecord?.id,
      sentiment: "MIXED",
      summary: "评论集中关注内容工作流落地、人设一致性和人工审核边界，适合作为下一轮选题与人设规则输入。",
      keywords: ["工作流落地", "人设一致性", "人工审核"],
      sourceReportId: report.id,
      sourceAgentRunId: run.id,
      createdAt: now,
      updatedAt: now
    };
    store.commentInsights.unshift(commentInsight);

    const experiments: Experiment[] = output.hypotheses.map((hypothesis, index) => ({
      id: nextId("experiment"),
      workspaceId: this.workspaceId,
      name: `复盘假设实验 ${index + 1}`,
      hypothesis,
      status: "PLANNED",
      metric: index === 0 ? "点击率" : "收藏率",
      createdAt: now,
      updatedAt: now
    }));
    store.experiments.unshift(...experiments);

    const hypotheses: ABHypothesis[] = output.hypotheses.map((hypothesis, index) => ({
      id: nextId("ab_hypothesis"),
      workspaceId: this.workspaceId,
      experimentId: experiments[index]?.id,
      title: hypothesis,
      variantA: index === 0 ? "沿用当前标题结构" : "仅保留文字流程清单",
      variantB: index === 0 ? "标题加入团队规模或适用场景" : "加入前后对比图和风险检查清单",
      successMetric: experiments[index]?.metric ?? "互动率",
      rationale: `来自 ${report.title} 的异常和表现解释，适合进入下一轮 A/B 验证。`,
      sourceReportId: report.id,
      sourceAgentRunId: run.id,
      createdAt: now,
      updatedAt: now
    }));
    store.abHypotheses.unshift(...hypotheses);

    const recommendations: Recommendation[] = output.recommendations.map((recommendation) => ({
      id: nextId("recommendation"),
      workspaceId: this.workspaceId,
      sourceType: "ANALYTICS_REPORT",
      title: recommendation,
      rationale: `来自 ${report.title}：${output.summary}`,
      targetModule: "TOPIC",
      status: "OPEN",
      sourceReportId: report.id,
      sourceAgentRunId: run.id,
      createdAt: now,
      updatedAt: now
    }));
    store.recommendations.unshift(...recommendations);

    const personaRecommendation = output.anomalies[0]
      ? {
          id: nextId("recommendation"),
          workspaceId: this.workspaceId,
          sourceType: "ANALYTICS_ANOMALY",
          title: "补充人设记忆中的异常解释边界",
          rationale: output.anomalies[0],
          targetModule: "PERSONA" as const,
          status: "OPEN" as const,
          sourceReportId: report.id,
          sourceAgentRunId: run.id,
          createdAt: now,
          updatedAt: now
        }
      : undefined;
    if (personaRecommendation) {
      store.recommendations.unshift(personaRecommendation);
    }
  }
}
