import { AnalyticsAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { MetricRecord, Platform } from "@/types/domain";

export type MetricImportFormat = "RECORDS" | "JSON" | "CSV" | "TSV" | "EXCEL";

export interface MetricImportRecordInput {
  title: string;
  platform: Platform | string;
  views: number | string;
  likes: number | string;
  comments: number | string;
  shares: number | string;
  conversions: number | string;
  publishedAt?: string;
}

export interface MetricImportPayload {
  records?: MetricImportRecordInput[];
  rawText?: string;
  fileContent?: string;
  fileType?: MetricImportFormat;
  fileName?: string;
}

const platformAliases: Record<string, Platform> = {
  all: "ALL",
  全网: "ALL",
  douyin: "DOUYIN",
  抖音: "DOUYIN",
  xiaohongshu: "XIAOHONGSHU",
  xhs: "XIAOHONGSHU",
  小红书: "XIAOHONGSHU",
  bilibili: "BILIBILI",
  b站: "BILIBILI",
  wechat: "WECHAT",
  公众号: "WECHAT",
  微信: "WECHAT",
  weibo: "WEIBO",
  微博: "WEIBO",
  kuaishou: "KUAISHOU",
  快手: "KUAISHOU",
  videoaccount: "VIDEO_ACCOUNT",
  视频号: "VIDEO_ACCOUNT",
  other: "OTHER",
  其他: "OTHER"
};

const allowedPlatforms: Platform[] = [
  "ALL",
  "DOUYIN",
  "XIAOHONGSHU",
  "BILIBILI",
  "WECHAT",
  "WEIBO",
  "KUAISHOU",
  "VIDEO_ACCOUNT",
  "OTHER"
];

const metricHeaderAliases = {
  title: ["title", "name", "posttitle", "作品", "标题", "内容标题"],
  platform: ["platform", "channel", "平台", "渠道"],
  views: ["views", "view", "impressions", "曝光", "曝光量", "播放", "播放量", "阅读", "阅读量"],
  likes: ["likes", "like", "点赞", "点赞数"],
  comments: ["comments", "comment", "评论", "评论数"],
  shares: ["shares", "share", "分享", "分享数", "转发", "转发数"],
  conversions: ["conversions", "conversion", "leads", "转化", "转化数", "线索", "线索数"],
  publishedAt: ["publishedat", "published", "发布时间", "发布日期", "日期"]
} as const;

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parseNumber(value: unknown, fieldName: string) {
  const normalized = typeof value === "number" ? value.toString() : String(value ?? "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`导入字段 ${fieldName} 必须是非负数字`);
  }
  return Math.round(parsed);
}

function parsePlatform(value: unknown): Platform {
  const normalized = normalizeKey(String(value ?? ""));
  const alias = platformAliases[normalized];
  if (alias) {
    return alias;
  }
  const upper = String(value ?? "").trim().toUpperCase() as Platform;
  if (allowedPlatforms.includes(upper)) {
    return upper;
  }
  throw new Error(`导入平台不受支持：${String(value ?? "")}`);
}

function getField(row: Record<string, unknown>, aliases: readonly string[]) {
  const normalizedRow = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]));
  for (const alias of aliases) {
    const value = normalizedRow[normalizeKey(alias)];
    if (value !== undefined && value !== "") {
      return value;
    }
  }
  return undefined;
}

function coerceImportRow(row: unknown): Record<string, unknown> {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("导入记录必须是对象");
  }
  return Object.fromEntries(Object.entries(row));
}

function normalizeMetricRecord(row: Record<string, unknown>): MetricImportRecordInput {
  const title = getField(row, metricHeaderAliases.title);
  if (!title) {
    throw new Error("导入记录缺少作品标题");
  }

  return {
    title: String(title).trim(),
    platform: parsePlatform(getField(row, metricHeaderAliases.platform) ?? "OTHER"),
    views: parseNumber(getField(row, metricHeaderAliases.views) ?? 0, "views"),
    likes: parseNumber(getField(row, metricHeaderAliases.likes) ?? 0, "likes"),
    comments: parseNumber(getField(row, metricHeaderAliases.comments) ?? 0, "comments"),
    shares: parseNumber(getField(row, metricHeaderAliases.shares) ?? 0, "shares"),
    conversions: parseNumber(getField(row, metricHeaderAliases.conversions) ?? 0, "conversions"),
    publishedAt: String(getField(row, metricHeaderAliases.publishedAt) ?? "").trim() || undefined
  };
}

function parseCsvLine(line: string, delimiter: "," | "\t") {
  if (delimiter === "\t") {
    return line.split("\t").map((cell) => cell.trim());
  }

  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseDelimitedText(rawText: string, delimiter: "," | "\t") {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error("导入表格至少需要表头和一行数据");
  }

  const headers = parseCsvLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line, delimiter);
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    return normalizeMetricRecord(row);
  });
}

function parseJsonText(rawText: string) {
  const parsed = JSON.parse(rawText) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed && "records" in parsed
      ? (parsed as { records: unknown }).records
      : typeof parsed === "object" && parsed && "data" in parsed
        ? (parsed as { data: unknown }).data
        : undefined;

  if (!Array.isArray(rows)) {
    throw new Error("JSON 导入必须是数组，或包含 records/data 数组");
  }

  return rows.map((row) => normalizeMetricRecord(coerceImportRow(row)));
}

export function parseMetricImport(payload: MetricImportPayload) {
  if (payload.records?.length) {
    return payload.records.map((record) => normalizeMetricRecord(coerceImportRow(record)));
  }

  const rawText = payload.rawText ?? payload.fileContent;
  if (!rawText?.trim()) {
    throw new Error("导入内容不能为空");
  }

  const fileType = payload.fileType ?? (rawText.trim().startsWith("[") || rawText.trim().startsWith("{") ? "JSON" : "CSV");
  if (fileType === "JSON") {
    return parseJsonText(rawText);
  }

  const delimiter = fileType === "TSV" || fileType === "EXCEL" || rawText.includes("\t") ? "\t" : ",";
  return parseDelimitedText(rawText, delimiter);
}

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
  importPayload: MetricImportPayload;
}) {
  const records = parseMetricImport(input.importPayload);
  const imported: MetricRecord[] = records.map((record) => ({
    id: nextId("metric"),
    workspaceId: input.workspaceId,
    title: record.title,
    platform: parsePlatform(record.platform),
    publishedAt: record.publishedAt ?? new Date().toISOString(),
    views: parseNumber(record.views, "views"),
    likes: parseNumber(record.likes, "likes"),
    comments: parseNumber(record.comments, "comments"),
    shares: parseNumber(record.shares, "shares"),
    conversions: parseNumber(record.conversions, "conversions")
  }));
  store.metricRecords.unshift(...imported);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "analytics.import",
    entityType: "ImportedMetricFile",
    summary: `导入 ${imported.length} 条指标数据`,
    metadata: {
      sourceType: "USER_UPLOAD",
      fileName: input.importPayload.fileName,
      fileType: input.importPayload.fileType ?? (input.importPayload.records ? "RECORDS" : undefined)
    }
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
