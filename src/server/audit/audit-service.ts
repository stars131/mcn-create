import { store } from "@/server/services/mock-store";
import type { AuditLog } from "@/types/domain";

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  userId?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
}

export interface AuditLogExportSnapshot {
  schemaVersion: "contentos.auditLogExport.v1";
  exportedAt: string;
  workspaceId: string;
  filters: AuditLogFilters;
  itemCount: number;
  logs: AuditLog[];
}

export interface AuditLogCsvExport {
  schemaVersion: "contentos.auditLogCsvExport.v1";
  exportedAt: string;
  workspaceId: string;
  filters: AuditLogFilters;
  itemCount: number;
  content: string;
}

export interface AuditLogPage {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export function writeAuditLog(input: Omit<AuditLog, "id" | "createdAt">) {
  const log: AuditLog = {
    id: `audit_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...input
  };

  store.auditLogs.unshift(log);
  return log;
}

function normalizeText(value?: string | null) {
  return value?.trim() || undefined;
}

function normalizeDate(value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }

  return Number.isNaN(Date.parse(normalized)) ? undefined : normalized;
}

function normalizeLimit(value?: string | number | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.min(100, Math.max(1, Math.trunc(value))) : undefined;
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? undefined : Math.min(100, Math.max(1, parsed));
}

function normalizePage(value?: string | number | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : undefined;
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? undefined : Math.max(1, parsed);
}

export function parseAuditLogFilters(input: {
  action?: string | null;
  entityType?: string | null;
  userId?: string | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: string | number | null;
  page?: string | number | null;
  pageSize?: string | number | null;
}): AuditLogFilters {
  return {
    action: normalizeText(input.action),
    entityType: normalizeText(input.entityType),
    userId: normalizeText(input.userId),
    q: normalizeText(input.q),
    from: normalizeDate(input.from),
    to: normalizeDate(input.to),
    limit: normalizeLimit(input.limit),
    page: normalizePage(input.page),
    pageSize: normalizeLimit(input.pageSize)
  };
}

function stringifySearchValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function matchesAuditQuery(log: AuditLog, query: string) {
  const normalizedQuery = query.toLowerCase();
  const haystack = [
    log.id,
    log.action,
    log.entityType,
    log.entityId,
    log.summary,
    log.userId,
    stringifySearchValue(log.metadata)
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function matchesAuditFilters(log: AuditLog, filters: AuditLogFilters) {
  if (filters.action && log.action !== filters.action) {
    return false;
  }
  if (filters.entityType && log.entityType !== filters.entityType) {
    return false;
  }
  if (filters.userId && log.userId !== filters.userId) {
    return false;
  }
  if (filters.q && !matchesAuditQuery(log, filters.q)) {
    return false;
  }
  if (filters.from && Date.parse(log.createdAt) < Date.parse(filters.from)) {
    return false;
  }
  if (filters.to && Date.parse(log.createdAt) > Date.parse(filters.to)) {
    return false;
  }

  return true;
}

const sensitiveAuditKeys = new Set([
  "accesstoken",
  "apikey",
  "authorization",
  "cookie",
  "keyhash",
  "password",
  "refreshtoken",
  "secret",
  "secrethash",
  "token",
  "tokenref"
]);

function shouldRedactAuditKey(key: string) {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return sensitiveAuditKeys.has(normalizedKey) || normalizedKey.endsWith("secret") || normalizedKey.endsWith("token");
}

function redactAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactAuditValue(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      shouldRedactAuditKey(key) ? "[REDACTED]" : redactAuditValue(item)
    ])
  );
}

function redactAuditLog(log: AuditLog): AuditLog {
  return {
    ...log,
    metadata: log.metadata ? (redactAuditValue(log.metadata) as Record<string, unknown>) : undefined
  };
}

function stringifyCsvValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function escapeCsvValue(value: unknown) {
  const text = stringifyCsvValue(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function serializeAuditLogsToCsv(logs: AuditLog[]) {
  const columns: Array<keyof AuditLog | "metadata"> = [
    "id",
    "createdAt",
    "workspaceId",
    "userId",
    "action",
    "entityType",
    "entityId",
    "summary",
    "metadata"
  ];
  const rows = logs.map((log) =>
    columns
      .map((column) => (column === "metadata" ? escapeCsvValue(log.metadata ?? {}) : escapeCsvValue(log[column])))
      .join(",")
  );

  return [columns.join(","), ...rows].join("\n");
}

function writeAuditLogExportEvent(input: {
  workspaceId: string;
  userId: string;
  filters: AuditLogFilters;
  itemCount: number;
  schemaVersion: AuditLogExportSnapshot["schemaVersion"] | AuditLogCsvExport["schemaVersion"];
  format: "json" | "csv";
}) {
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "audit_log.export",
    entityType: "AuditLog",
    summary: `导出审计日志：${input.itemCount} 条`,
    metadata: {
      filters: input.filters,
      itemCount: input.itemCount,
      schemaVersion: input.schemaVersion,
      format: input.format
    }
  });
}

function listFilteredAuditLogs(workspaceId: string, filters: AuditLogFilters) {
  return store.auditLogs
    .filter((log) => !log.workspaceId || log.workspaceId === workspaceId)
    .filter((log) => matchesAuditFilters(log, filters))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAuditLogs(workspaceId = "ws_demo", filters: AuditLogFilters = {}) {
  const filtered = listFilteredAuditLogs(workspaceId, filters);

  return typeof filters.limit === "number" ? filtered.slice(0, filters.limit) : filtered;
}

export function listAuditLogPage(workspaceId = "ws_demo", filters: AuditLogFilters = {}): AuditLogPage {
  const filtered = listFilteredAuditLogs(workspaceId, filters);
  const pageSize = filters.pageSize ?? filters.limit ?? 20;
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page ?? 1, pageCount);
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount,
    hasPreviousPage: page > 1,
    hasNextPage: page < pageCount
  };
}

export function exportAuditLogSnapshot(input: {
  workspaceId: string;
  userId: string;
  filters?: AuditLogFilters;
}): AuditLogExportSnapshot {
  const filters = input.filters ?? {};
  const logs = listAuditLogs(input.workspaceId, filters).map(redactAuditLog);
  const snapshot: AuditLogExportSnapshot = {
    schemaVersion: "contentos.auditLogExport.v1",
    exportedAt: new Date().toISOString(),
    workspaceId: input.workspaceId,
    filters,
    itemCount: logs.length,
    logs
  };

  writeAuditLogExportEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    filters,
    itemCount: logs.length,
    schemaVersion: snapshot.schemaVersion,
    format: "json"
  });

  return snapshot;
}

export function exportAuditLogCsv(input: {
  workspaceId: string;
  userId: string;
  filters?: AuditLogFilters;
}): AuditLogCsvExport {
  const filters = input.filters ?? {};
  const logs = listAuditLogs(input.workspaceId, filters).map(redactAuditLog);
  const csvExport: AuditLogCsvExport = {
    schemaVersion: "contentos.auditLogCsvExport.v1",
    exportedAt: new Date().toISOString(),
    workspaceId: input.workspaceId,
    filters,
    itemCount: logs.length,
    content: serializeAuditLogsToCsv(logs)
  };

  writeAuditLogExportEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    filters,
    itemCount: logs.length,
    schemaVersion: csvExport.schemaVersion,
    format: "csv"
  });

  return csvExport;
}
