import { store } from "@/server/services/mock-store";
import type { AuditLog } from "@/types/domain";

export function writeAuditLog(input: Omit<AuditLog, "id" | "createdAt">) {
  const log: AuditLog = {
    id: `audit_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...input
  };

  store.auditLogs.unshift(log);
  return log;
}

export function listAuditLogs(workspaceId = "ws_demo") {
  return store.auditLogs.filter((log) => !log.workspaceId || log.workspaceId === workspaceId);
}
