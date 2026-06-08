import { describe, expect, it } from "vitest";
import {
  generateAnalyticsReport,
  importMetricData,
  parseMetricImport,
  recommendationsToTopics
} from "@/server/services/analytics-service";
import { manualMetricImportAdapter } from "@/server/analytics/metric-import-adapter";
import { store } from "@/server/services/mock-store";

describe("analytics import", () => {
  it("normalizes manual upload payloads through the import adapter", () => {
    const result = manualMetricImportAdapter.parse({
      records: [
        {
          title: "Adapter import",
          platform: "视频号",
          views: "1,200",
          likes: "80",
          comments: 6,
          shares: 12,
          conversions: 3
        }
      ]
    });

    expect(result).toEqual({
      fileType: "RECORDS",
      records: [
        {
          title: "Adapter import",
          platform: "VIDEO_ACCOUNT",
          views: 1200,
          likes: 80,
          comments: 6,
          shares: 12,
          conversions: 3
        }
      ]
    });
    expect(manualMetricImportAdapter.supportedFileTypes).toContain("EXCEL");
  });

  it("parses CSV text with Chinese headers and platform aliases", () => {
    const records = parseMetricImport({
      fileType: "CSV",
      rawText: [
        "作品,平台,曝光,点赞,评论,分享,转化,发布时间",
        '"导入样例,含逗号",公众号,16800,820,91,134,42,2026-06-07'
      ].join("\n")
    });

    expect(records).toEqual([
      {
        title: "导入样例,含逗号",
        platform: "WECHAT",
        views: 16800,
        likes: 820,
        comments: 91,
        shares: 134,
        conversions: 42,
        publishedAt: "2026-06-07"
      }
    ]);
  });

  it("parses JSON payloads with records arrays", () => {
    const records = parseMetricImport({
      fileType: "JSON",
      rawText: JSON.stringify({
        records: [
          {
            title: "JSON 导入样例",
            platform: "小红书",
            views: "3600",
            likes: 300,
            comments: 18,
            shares: 42,
            conversions: 9
          }
        ]
      })
    });

    expect(records[0]).toMatchObject({
      title: "JSON 导入样例",
      platform: "XIAOHONGSHU",
      views: 3600,
      conversions: 9
    });
  });

  it("parses Excel-style TSV table text", () => {
    const records = parseMetricImport({
      fileType: "EXCEL",
      rawText: ["标题\t平台\t曝光\t点赞\t评论\t分享\t转化", "Excel 粘贴样例\t抖音\t12000\t980\t76\t130\t28"].join(
        "\n"
      )
    });

    expect(records[0]).toMatchObject({
      title: "Excel 粘贴样例",
      platform: "DOUYIN",
      views: 12000,
      likes: 980,
      conversions: 28
    });
  });

  it("persists imported metrics and writes an audit log", () => {
    const beforeMetrics = store.metricRecords.length;
    const beforeFiles = store.importedMetricFiles.length;
    const beforeAudits = store.auditLogs.length;

    try {
      const imported = importMetricData({
        workspaceId: "ws_demo",
        userId: "user_owner",
        importPayload: {
          fileType: "CSV",
          fileName: "metrics.csv",
          rawText: ["title,platform,views,likes,comments,shares,conversions", "Persisted import,WECHAT,100,12,3,4,2"].join(
            "\n"
          )
        }
      });

      expect(imported).toHaveLength(1);
      expect(imported[0].id).toMatch(/^metric_/);
      expect(imported[0].importedMetricFileId).toBe(store.importedMetricFiles[0].id);
      expect(store.metricRecords.length).toBe(beforeMetrics + 1);
      expect(store.importedMetricFiles.length).toBe(beforeFiles + 1);
      expect(store.importedMetricFiles[0]).toMatchObject({
        fileName: "metrics.csv",
        fileType: "CSV",
        rowCount: 1,
        status: "PARSED"
      });
      expect(store.importedMetricFiles[0].parsedData?.[0]).toMatchObject({
        title: "Persisted import",
        platform: "WECHAT",
        conversions: 2
      });
      expect(store.auditLogs.length).toBe(beforeAudits + 1);
      expect(store.auditLogs[0]).toMatchObject({
        action: "analytics.import",
        entityType: "ImportedMetricFile",
        entityId: store.importedMetricFiles[0].id
      });
    } finally {
      store.metricRecords.splice(0, store.metricRecords.length - beforeMetrics);
      store.importedMetricFiles.splice(0, store.importedMetricFiles.length - beforeFiles);
    }
  });

  it("persists report artifacts and converts open topic recommendations", async () => {
    const beforeReports = store.analyticsReports.length;
    const beforeInsights = store.commentInsights.length;
    const beforeExperiments = store.experiments.length;
    const beforeHypotheses = store.abHypotheses.length;
    const beforeRecommendations = store.recommendations.length;
    const beforeTopics = store.topics.length;
    const beforeAngleIds = new Set(store.topicAngles.map((angle) => angle.id));
    const beforeScoreIds = new Set(store.topicScores.map((score) => score.id));
    const beforeStatusHistoryIds = new Set(store.topicStatusHistories.map((history) => history.id));
    const beforeAgentRunIds = new Set(store.agentRuns.map((run) => run.id));
    const beforeStepIds = new Set(store.agentSteps.map((step) => step.id));
    const beforeOutputIds = new Set(store.agentOutputs.map((output) => output.id));
    const beforeUsageIds = new Set(store.usageEvents.map((event) => event.id));
    const beforeCreditIds = new Set(store.creditLedger.map((entry) => entry.id));

    try {
      const report = await generateAnalyticsReport({ workspaceId: "ws_demo", userId: "user_owner", period: "本周" });
      const sourceReport = store.analyticsReports[0];
      const openTopicRecommendations = store.recommendations.filter(
        (recommendation) =>
          recommendation.workspaceId === "ws_demo" &&
          recommendation.sourceReportId === sourceReport.id &&
          recommendation.targetModule === "TOPIC" &&
          recommendation.status === "OPEN"
      );

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(sourceReport.sourceAgentRunId).toMatch(/^run_/);
      expect(store.commentInsights.length).toBe(beforeInsights + 1);
      expect(store.experiments.length).toBe(beforeExperiments + report.hypotheses.length);
      expect(store.abHypotheses.length).toBe(beforeHypotheses + report.hypotheses.length);
      expect(openTopicRecommendations).toHaveLength(report.recommendations.length);

      const allOpenTopicRecommendations = store.recommendations.filter(
        (recommendation) =>
          recommendation.workspaceId === "ws_demo" && recommendation.targetModule === "TOPIC" && recommendation.status === "OPEN"
      );
      const topics = recommendationsToTopics({ workspaceId: "ws_demo", userId: "user_owner" });

      expect(topics).toHaveLength(allOpenTopicRecommendations.length);
      expect(topics.some((topic) => topic.sourceAgentRunId === sourceReport.sourceAgentRunId)).toBe(true);
      expect(openTopicRecommendations.every((recommendation) => recommendation.status === "CONVERTED")).toBe(true);
      expect(openTopicRecommendations.every((recommendation) => recommendation.generatedTopicIds?.length === 1)).toBe(true);
      expect(store.topicAngles.filter((angle) => !beforeAngleIds.has(angle.id))).toHaveLength(topics.length);
      expect(store.topicScores.filter((score) => !beforeScoreIds.has(score.id))).toHaveLength(topics.length);
      expect(store.topicStatusHistories.filter((history) => !beforeStatusHistoryIds.has(history.id))).toHaveLength(
        topics.length
      );
      expect(store.auditLogs[0].metadata?.topicScoreIds).toHaveLength(topics.length);
    } finally {
      store.analyticsReports.splice(0, store.analyticsReports.length - beforeReports);
      store.commentInsights.splice(0, store.commentInsights.length - beforeInsights);
      store.experiments.splice(0, store.experiments.length - beforeExperiments);
      store.abHypotheses.splice(0, store.abHypotheses.length - beforeHypotheses);
      store.recommendations.splice(0, store.recommendations.length - beforeRecommendations);
      store.topics.splice(0, store.topics.length - beforeTopics);
      store.topicAngles = store.topicAngles.filter((angle) => beforeAngleIds.has(angle.id));
      store.topicScores = store.topicScores.filter((score) => beforeScoreIds.has(score.id));
      store.topicStatusHistories = store.topicStatusHistories.filter((history) => beforeStatusHistoryIds.has(history.id));
      store.agentRuns = store.agentRuns.filter((run) => beforeAgentRunIds.has(run.id));
      store.agentSteps = store.agentSteps.filter((step) => beforeStepIds.has(step.id));
      store.agentOutputs = store.agentOutputs.filter((output) => beforeOutputIds.has(output.id));
      store.usageEvents = store.usageEvents.filter((event) => beforeUsageIds.has(event.id));
      store.creditLedger = store.creditLedger.filter((entry) => beforeCreditIds.has(entry.id));
    }
  });
});
