import { store } from "@/server/services/mock-store";
import type { AuditLog } from "@/types/domain";

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface AuditLogExportSnapshot {
  schemaVersion: "contentos.auditLogExport.v1";
  exportedAt: string;
  workspaceId: string;
  filters: AuditLogFilters;
  itemCount: number;
  logs: AuditLog[];
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

export function parseAuditLogFilters(input: {
  action?: string | null;
  entityType?: string | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: string | number | null;
}): AuditLogFilters {
  return {
    action: normalizeText(input.action),
    entityType: normalizeText(input.entityType),
    q: normalizeText(input.q),
    from: normalizeDate(input.from),
    to: normalizeDate(input.to),
    limit: normalizeLimit(input.limit)
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

export function listAuditLogs(workspaceId = "ws_demo", filters: AuditLogFilters = {}) {
  const filtered = store.auditLogs
    .filter((log) => !log.workspaceId || log.workspaceId === workspaceId)
    .filter((log) => matchesAuditFilters(log, filters))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return typeof filters.limit === "number" ? filtered.slice(0, filters.limit) : filtered;
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

  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "audit_log.export",
    entityType: "AuditLog",
    summary: `导出审计日志：${logs.length} 条`,
    metadata: {
      filters,
      itemCount: logs.length,
      schemaVersion: snapshot.schemaVersion
    }
  });

  return snapshot;
}
