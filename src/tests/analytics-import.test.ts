import { describe, expect, it } from "vitest";
import { importMetricData, parseMetricImport } from "@/server/services/analytics-service";
import { store } from "@/server/services/mock-store";

describe("analytics import", () => {
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
    const beforeAudits = store.auditLogs.length;

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
    expect(store.metricRecords.length).toBe(beforeMetrics + 1);
    expect(store.auditLogs.length).toBe(beforeAudits + 1);
    expect(store.auditLogs[0]).toMatchObject({
      action: "analytics.import",
      entityType: "ImportedMetricFile"
    });
  });
});
