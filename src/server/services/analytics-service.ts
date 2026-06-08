import { AnalyticsAgent } from "@/server/agents";
import {
  manualMetricImportAdapter,
  type MetricImportPayload as ServiceMetricImportPayload
} from "@/server/analytics/metric-import-adapter";
import { writeAuditLog } from "@/server/audit/audit-service";
import { enqueueAndProcessAgentJob } from "@/server/queue/agent-queue";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import {
  listAccountMetricDaily,
  listPostMetricDaily,
  listPublishedPosts
} from "@/server/services/publishing-service";
import { createInitialTopicRuntimeRecords } from "@/server/services/topic-runtime";
import type { ImportedMetricFile, MetricRecord, Platform, Recommendation, Topic } from "@/types/domain";

export { parseMetricImport } from "@/server/analytics/metric-import-adapter";
export type {
  MetricImportFormat,
  MetricImportPayload,
  MetricImportRecordInput
} from "@/server/analytics/metric-import-adapter";

const fallbackImportFileName = "manual-metric-import";

export function getAnalyticsOverview(workspaceId: string) {
  const records = getWorkspaceScoped(store.metricRecords, workspaceId);
  const postDailyMetrics = listPostMetricDaily(workspaceId);
  const accountDailyMetrics = listAccountMetricDaily(workspaceId);
  const publishedPosts = listPublishedPosts(workspaceId);
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
  const publishedTotals = postDailyMetrics.reduce(
    (acc, metric) => ({
      views: acc.views + metric.views,
      likes: acc.likes + metric.likes,
      comments: acc.comments + metric.comments,
      shares: acc.shares + metric.shares,
      conversions: acc.conversions + metric.conversions
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, conversions: 0 }
  );
  const combinedTotals = {
    views: totals.views + publishedTotals.views,
    likes: totals.likes + publishedTotals.likes,
    comments: totals.comments + publishedTotals.comments,
    shares: totals.shares + publishedTotals.shares,
    conversions: totals.conversions + publishedTotals.conversions
  };
  return {
    totals: combinedTotals,
    importedTotals: totals,
    publishedTotals,
    trend: [
      ...records.map((record) => ({
        name: record.title.slice(0, 8),
        views: record.views,
        engagement: record.likes + record.comments + record.shares,
        conversions: record.conversions
      })),
      ...postDailyMetrics.map((metric) => ({
        name: `${metric.platform}-${metric.metricDate.slice(5, 10)}`,
        views: metric.views,
        engagement: metric.likes + metric.comments + metric.shares,
        conversions: metric.conversions
      }))
    ],
    publishedPosts,
    postDailyMetrics,
    accountDailyMetrics,
    importedFiles: getWorkspaceScoped(store.importedMetricFiles, workspaceId),
    reports: getWorkspaceScoped(store.analyticsReports, workspaceId),
    commentInsights: getWorkspaceScoped(store.commentInsights, workspaceId),
    experiments: getWorkspaceScoped(store.experiments, workspaceId),
    abHypotheses: getWorkspaceScoped(store.abHypotheses, workspaceId),
    recommendations: getWorkspaceScoped(store.recommendations, workspaceId)
  };
}

export function listPostMetrics(workspaceId: string) {
  return getWorkspaceScoped(store.metricRecords, workspaceId);
}

export function importMetricData(input: {
  workspaceId: string;
  userId: string;
  importPayload: ServiceMetricImportPayload;
}) {
  const { fileType, records } = manualMetricImportAdapter.parse(input.importPayload);
  const now = new Date().toISOString();
  const importedFile: ImportedMetricFile = {
    id: nextId("import_file"),
    workspaceId: input.workspaceId,
    fileName: input.importPayload.fileName ?? `${fallbackImportFileName}.${fileType.toLowerCase()}`,
    fileType,
    sourceType: manualMetricImportAdapter.sourceType,
    rowCount: records.length,
    status: "PARSED",
    createdAt: now,
    updatedAt: now
  };
  const imported: MetricRecord[] = records.map((record) => ({
    id: nextId("metric"),
    workspaceId: input.workspaceId,
    importedMetricFileId: importedFile.id,
    title: record.title,
    platform: record.platform,
    publishedAt: record.publishedAt ?? now,
    views: record.views,
    likes: record.likes,
    comments: record.comments,
    shares: record.shares,
    conversions: record.conversions
  }));
  importedFile.parsedData = imported.map((record) => ({
    title: record.title,
    platform: record.platform,
    publishedAt: record.publishedAt,
    views: record.views,
    likes: record.likes,
    comments: record.comments,
    shares: record.shares,
    conversions: record.conversions
  }));
  store.importedMetricFiles.unshift(importedFile);
  store.metricRecords.unshift(...imported);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "analytics.import",
    entityType: "ImportedMetricFile",
    entityId: importedFile.id,
    summary: `导入 ${imported.length} 条指标数据`,
    metadata: {
      adapterId: manualMetricImportAdapter.id,
      sourceType: manualMetricImportAdapter.sourceType,
      fileName: importedFile.fileName,
      fileType: importedFile.fileType,
      metricIds: imported.map((record) => record.id)
    }
  });
  return imported;
}

export async function generateAnalyticsReport(input: { workspaceId: string; userId: string; period?: string }) {
  const payload = {
    metricIds: getWorkspaceScoped(store.metricRecords, input.workspaceId).map((record) => record.id),
    period: input.period ?? "本周"
  };
  const { job, result } = await enqueueAndProcessAgentJob("agent.analytics.report", {
    workspaceId: input.workspaceId,
    userId: input.userId,
    input: payload
  }, async (payload) => {
    const agent = new AnalyticsAgent(payload.workspaceId, payload.userId);
    return agent.run(payload.input);
  });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "analytics.report.generate",
    entityType: "AnalyticsReport",
    summary: `生成数据复盘：${payload.period}`,
    metadata: { queueJobId: job.id, queueStatus: job.status }
  });
  return result;
}

export function recommendationsToTopics(input: { workspaceId: string; userId: string }) {
  let recommendations = getWorkspaceScoped(store.recommendations, input.workspaceId).filter(
    (recommendation) => recommendation.status === "OPEN" && recommendation.targetModule === "TOPIC"
  );

  if (!recommendations.length) {
    const report = getWorkspaceScoped(store.analyticsReports, input.workspaceId)[0];
    recommendations = report
      ? report.recommendations.map<Recommendation>((recommendation) => ({
          id: nextId("recommendation"),
          workspaceId: input.workspaceId,
          sourceType: "ANALYTICS_REPORT",
          title: recommendation,
          rationale: "由历史周报字符串建议补建的运行时推荐记录。",
          targetModule: "TOPIC",
          status: "OPEN",
          sourceReportId: report.id,
          sourceAgentRunId: report.sourceAgentRunId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
      : [];
    store.recommendations.unshift(...recommendations);
  }

  if (!recommendations.length) {
    return [];
  }
  const now = new Date().toISOString();
  const topics = recommendations.map<Topic>((recommendation) => ({
    id: nextId("topic"),
    workspaceId: input.workspaceId,
    title: `复盘回流：${recommendation.title}`,
    angle: "由数据复盘建议回流到选题池，等待编辑评估。",
    audience: "内容团队负责人",
    status: "PENDING" as const,
    targetPlatforms: ["XIAOHONGSHU", "WECHAT"] as Platform[],
    score: 73,
    riskLevel: "LOW" as const,
    outline: ["数据发现", recommendation.rationale, "执行计划"],
    sourceAgentRunId: recommendation.sourceAgentRunId,
    createdAt: now
  }));
  store.topics.unshift(...topics);
  const runtimeRecords = topics.map((topic) =>
    createInitialTopicRuntimeRecords(topic, {
      userId: input.userId,
      reason: "数据复盘建议回流到选题池",
      now,
      scoreRationale: "由数据分析建议转化，默认按业务价值和执行可行性生成评分拆解。"
    })
  );
  recommendations.forEach((recommendation, index) => {
    recommendation.status = "CONVERTED";
    recommendation.generatedTopicIds = [...(recommendation.generatedTopicIds ?? []), topics[index].id];
    recommendation.updatedAt = now;
  });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "analytics.recommendations.to_topics",
    entityType: "Recommendation",
    entityId: recommendations[0]?.id,
    summary: `将 ${topics.length} 条复盘建议回流到选题池`,
    metadata: {
      recommendationIds: recommendations.map((recommendation) => recommendation.id),
      topicIds: topics.map((topic) => topic.id),
      topicAngleIds: runtimeRecords.map((record) => record.angle.id),
      topicScoreIds: runtimeRecords.map((record) => record.score.id),
      topicStatusHistoryIds: runtimeRecords.map((record) => record.statusHistory.id)
    }
  });
  return topics;
}
