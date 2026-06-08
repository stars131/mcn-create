import { ApiError } from "@/server/errors";
import type { MetricImportFileType, Platform } from "@/types/domain";
import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";

export type MetricImportFormat = MetricImportFileType;

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

export interface NormalizedMetricImportRecord {
  title: string;
  platform: Platform;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  conversions: number;
  publishedAt?: string;
}

export interface MetricImportPayload {
  records?: MetricImportRecordInput[];
  rawText?: string;
  fileContent?: string;
  fileType?: MetricImportFormat;
  fileName?: string;
}

export interface MetricImportResult {
  fileType: MetricImportFileType;
  records: NormalizedMetricImportRecord[];
}

export interface MetricImportAdapter {
  id: string;
  sourceType: "USER_UPLOAD";
  supportedFileTypes: MetricImportFileType[];
  parse(payload: MetricImportPayload): MetricImportResult;
}

type XmlNode = Record<string, unknown>;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  removeNSPrefix: true
});

function isXmlNode(value: unknown): value is XmlNode {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
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

function rejectImport(message: string): never {
  throw new ApiError(message, 422);
}

function parseNumber(value: unknown, fieldName: string) {
  const normalized = typeof value === "number" ? value.toString() : String(value ?? "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    rejectImport(`导入字段 ${fieldName} 必须是非负数字`);
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
  rejectImport(`导入平台不受支持：${String(value ?? "")}`);
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
    rejectImport("导入记录必须是对象");
  }
  return Object.fromEntries(Object.entries(row));
}

function normalizeMetricRecord(row: Record<string, unknown>): NormalizedMetricImportRecord {
  const title = getField(row, metricHeaderAliases.title);
  if (!title) {
    rejectImport("导入记录缺少作品标题");
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
    rejectImport("导入表格至少需要表头和一行数据");
  }

  const headers = parseCsvLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line, delimiter);
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    return normalizeMetricRecord(row);
  });
}

function parseWorkbookRows(rows: unknown[][]) {
  const nonEmptyRows = rows.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  if (nonEmptyRows.length < 2) {
    rejectImport("Excel 导入至少需要表头和一行数据");
  }

  const headers = nonEmptyRows[0].map((cell) => String(cell ?? "").trim());
  return nonEmptyRows.slice(1).map((row) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
    return normalizeMetricRecord(record);
  });
}

function decodeWorkbookContent(fileContent: string) {
  const content = fileContent.trim();
  const base64 = content.startsWith("data:")
    ? content.replace(/^data:[^;]+;base64,/, "")
    : content;

  try {
    return Buffer.from(base64, "base64");
  } catch {
    rejectImport("Excel 导入文件内容不是有效的 base64");
  }
}

function readZipText(files: Record<string, Uint8Array>, path: string) {
  const file = files[path];
  return file ? strFromU8(file) : undefined;
}

function parseXmlNode(xml: string): XmlNode {
  const parsed = xmlParser.parse(xml) as unknown;
  if (!isXmlNode(parsed)) {
    throw new Error("Invalid XML document");
  }
  return parsed;
}

function getNode(value: unknown): XmlNode | undefined {
  return isXmlNode(value) ? value : undefined;
}

function getText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (isXmlNode(value)) {
    return getText(value["#text"]);
  }
  return "";
}

function resolveWorkbookSheetPath(files: Record<string, Uint8Array>) {
  const workbookXml = readZipText(files, "xl/workbook.xml");
  const relationshipXml = readZipText(files, "xl/_rels/workbook.xml.rels");
  if (!workbookXml) {
    throw new Error("Workbook manifest is missing");
  }

  const workbook = getNode(parseXmlNode(workbookXml).workbook);
  const sheets = getNode(workbook?.sheets);
  const firstSheet = asArray(sheets?.sheet as XmlNode | XmlNode[] | undefined).find(isXmlNode);
  const relationshipId = typeof firstSheet?.["r:id"] === "string" ? firstSheet["r:id"] : firstSheet?.id;

  if (relationshipXml && typeof relationshipId === "string") {
    const relationships = getNode(parseXmlNode(relationshipXml).Relationships);
    const relationship = asArray(relationships?.Relationship as XmlNode | XmlNode[] | undefined).find(
      (candidate) => isXmlNode(candidate) && candidate.Id === relationshipId
    );
    const target = typeof relationship?.Target === "string" ? relationship.Target : undefined;
    if (target) {
      const normalizedTarget = target.replace(/^\/+/, "");
      if (normalizedTarget.startsWith("xl/")) {
        return normalizedTarget;
      }
      return `xl/${normalizedTarget}`;
    }
  }

  return "xl/worksheets/sheet1.xml";
}

function readSharedStringItem(item: XmlNode) {
  const directText = getText(item.t);
  if (directText) {
    return directText;
  }

  return asArray(item.r as XmlNode | XmlNode[] | undefined)
    .filter(isXmlNode)
    .map((run) => getText(run.t))
    .join("");
}

function parseSharedStrings(files: Record<string, Uint8Array>) {
  const sharedStringsXml = readZipText(files, "xl/sharedStrings.xml");
  if (!sharedStringsXml) {
    return [];
  }

  const sharedStrings = getNode(parseXmlNode(sharedStringsXml).sst);
  return asArray(sharedStrings?.si as XmlNode | XmlNode[] | undefined)
    .filter(isXmlNode)
    .map(readSharedStringItem);
}

function getCellColumnIndex(reference: unknown) {
  if (typeof reference !== "string") {
    return undefined;
  }

  const letters = reference.match(/^[A-Z]+/i)?.[0];
  if (!letters) {
    return undefined;
  }

  return [...letters.toUpperCase()].reduce((column, letter) => column * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function readInlineString(cell: XmlNode) {
  const inlineString = getNode(cell.is);
  if (!inlineString) {
    return "";
  }

  const directText = getText(inlineString.t);
  if (directText) {
    return directText;
  }

  return asArray(inlineString.r as XmlNode | XmlNode[] | undefined)
    .filter(isXmlNode)
    .map((run) => getText(run.t))
    .join("");
}

function readCellValue(cell: XmlNode, sharedStrings: string[]) {
  const type = typeof cell.t === "string" ? cell.t : "";
  const rawValue = getText(cell.v);

  if (type === "s") {
    return sharedStrings[Number(rawValue)] ?? "";
  }
  if (type === "inlineStr") {
    return readInlineString(cell);
  }
  if (type === "str" || type === "b" || type === "e") {
    return rawValue;
  }
  return rawValue;
}

function parseWorksheetRows(worksheetXml: string, sharedStrings: string[]) {
  const worksheet = getNode(parseXmlNode(worksheetXml).worksheet);
  const sheetData = getNode(worksheet?.sheetData);
  const xmlRows = asArray(sheetData?.row as XmlNode | XmlNode[] | undefined).filter(isXmlNode);

  return xmlRows.map((xmlRow) => {
    const cells = asArray(xmlRow.c as XmlNode | XmlNode[] | undefined).filter(isXmlNode);
    const row: string[] = [];
    cells.forEach((cell, fallbackIndex) => {
      const columnIndex = getCellColumnIndex(cell.r) ?? fallbackIndex;
      row[columnIndex] = readCellValue(cell, sharedStrings);
    });
    return row.map((cell) => cell ?? "");
  });
}

function looksLikeWorkbookPayload(payload: MetricImportPayload, rawText: string) {
  const fileName = payload.fileName?.toLowerCase() ?? "";
  return (
    /\.(xlsx|xlsm)$/i.test(fileName) ||
    rawText.trim().startsWith("data:") ||
    rawText.trim().startsWith("UEs")
  );
}

function parseExcelWorkbook(payload: MetricImportPayload, fileContent: string) {
  try {
    const files = unzipSync(decodeWorkbookContent(fileContent));
    const sheetPath = resolveWorkbookSheetPath(files);
    const worksheetXml = readZipText(files, sheetPath);
    if (!worksheetXml) {
      rejectImport("Excel 导入文件没有可读取的工作表");
    }

    const rows = parseWorksheetRows(worksheetXml, parseSharedStrings(files));
    return parseWorkbookRows(rows);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    rejectImport("Excel 导入文件无法解析");
  }
}

function parseJsonText(rawText: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    rejectImport("JSON 导入内容格式不正确");
  }
  const rows = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed && "records" in parsed
      ? (parsed as { records: unknown }).records
      : typeof parsed === "object" && parsed && "data" in parsed
        ? (parsed as { data: unknown }).data
        : undefined;

  if (!Array.isArray(rows)) {
    rejectImport("JSON 导入必须是数组，或包含 records/data 数组");
  }

  return rows.map((row) => normalizeMetricRecord(coerceImportRow(row)));
}

export function inferMetricImportFileType(payload: MetricImportPayload): MetricImportFileType {
  if (payload.fileType) {
    return payload.fileType;
  }
  if (payload.records?.length) {
    return "RECORDS";
  }

  const rawText = payload.rawText ?? payload.fileContent ?? "";
  return rawText.trim().startsWith("[") || rawText.trim().startsWith("{") ? "JSON" : "CSV";
}

export function parseMetricImport(payload: MetricImportPayload) {
  if (payload.records?.length) {
    return payload.records.map((record) => normalizeMetricRecord(coerceImportRow(record)));
  }

  const rawText = payload.rawText ?? payload.fileContent;
  if (!rawText?.trim()) {
    rejectImport("导入内容不能为空");
  }

  const fileType = inferMetricImportFileType(payload);
  if (fileType === "JSON") {
    return parseJsonText(rawText);
  }

  if (fileType === "EXCEL" && looksLikeWorkbookPayload(payload, rawText)) {
    return parseExcelWorkbook(payload, rawText);
  }

  const delimiter = fileType === "TSV" || fileType === "EXCEL" || rawText.includes("\t") ? "\t" : ",";
  return parseDelimitedText(rawText, delimiter);
}

export const manualMetricImportAdapter: MetricImportAdapter = {
  id: "manual-metric-import-adapter",
  sourceType: "USER_UPLOAD",
  supportedFileTypes: ["RECORDS", "JSON", "CSV", "TSV", "EXCEL"],
  parse(payload) {
    return {
      fileType: inferMetricImportFileType(payload),
      records: parseMetricImport(payload)
    };
  }
};
