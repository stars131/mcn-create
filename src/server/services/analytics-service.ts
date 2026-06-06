import { AnalyticsAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { MetricRecord, Platform } from "@/types/domain";

export function getAnalyticsOverview(workspaceId: string) {
  const records = getWorkspaceScoped(store.metricRecords, workspaceId);
  const totals = records.reduce(
    (acc, record) => ({
      views: acc.views + record.views,
      likes: acc.likes + record.likes,
      comments: acc.comments + record.comments,
      shares: acc.shares + record.shares,
      conversions: acc.conversions + record.conversions
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, conversions: 0 }
  );
  return {
    totals,
    trend: records.map((record) => ({
      name: record.title.slice(0, 8),
      views: record.views,
      engagement: record.likes + record.comments + record.shares,
      conversions: record.conversions
    })),
    reports: getWorkspaceScoped(store.analyticsReports, workspaceId)
  };
}

export function listPostMetrics(workspaceId: string) {
  return getWorkspaceScoped(store.metricRecords, workspaceId);
}

export function importMetricData(input: {
  workspaceId: string;
  userId: string;
  records: Array<{
    title: string;
    platform: Platform;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    conversions: number;
  }>;
}) {
  const imported: MetricRecord[] = input.records.map((record) => ({
    id: nextId("metric"),
    workspaceId: input.workspaceId,
    title: record.title,
    platform: record.platform,
    publishedAt: new Date().toISOString(),
    views: record.views,
    likes: record.likes,
    comments: record.comments,
    shares: record.shares,
    conversions: record.conversions
  }));
  store.metricRecords.unshift(...imported);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "analytics.import",
    entityType: "ImportedMetricFile",
    summary: `导入 ${imported.length} 条指标数据`,
    metadata: { sourceType: "USER_UPLOAD" }
  });
  return imported;
}

export async function generateAnalyticsReport(input: { workspaceId: string; userId: string; period?: string }) {
  const agent = new AnalyticsAgent(input.workspaceId, input.userId);
  return agent.run({
    metricIds: getWorkspaceScoped(store.metricRecords, input.workspaceId).map((record) => record.id),
    period: input.period ?? "本周"
  });
}

export function recommendationsToTopics(input: { workspaceId: string; userId: string }) {
  const report = getWorkspaceScoped(store.analyticsReports, input.workspaceId)[0];
  if (!report) {
    return [];
  }
  const topics = report.recommendations.map((recommendation) => ({
    id: nextId("topic"),
    workspaceId: input.workspaceId,
    title: `复盘回流：${recommendation}`,
    angle: "由数据复盘建议回流到选题池，等待编辑评估。",
    audience: "内容团队负责人",
    status: "PENDING" as const,
    targetPlatforms: ["XIAOHONGSHU", "WECHAT"] as Platform[],
    score: 73,
    riskLevel: "LOW" as const,
    outline: ["数据发现", "内容假设", "执行计划"],
    createdAt: new Date().toISOString()
  }));
  store.topics.unshift(...topics);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "analytics.recommendations.to_topics",
    entityType: "Recommendation",
    summary: `将 ${topics.length} 条复盘建议回流到选题池`
  });
  return topics;
}
