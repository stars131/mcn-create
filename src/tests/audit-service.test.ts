import { describe, expect, it } from "vitest";
import {
  exportAuditLogCsv,
  exportAuditLogSnapshot,
  listAuditLogs,
  parseAuditLogFilters,
  writeAuditLog
} from "@/server/audit/audit-service";
import { store } from "@/server/services/mock-store";

describe("audit service", () => {
  it("filters audit logs by action, entity, query, date window, and limit", () => {
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));
    const from = new Date(Date.now() - 60_000).toISOString();
    const to = new Date(Date.now() + 60_000).toISOString();

    try {
      const first = writeAuditLog({
        workspaceId: "ws_demo",
        userId: "user_owner",
        action: "audit.test.first",
        entityType: "AuditFixture",
        entityId: "fixture_001",
        summary: "审计筛选测试一",
        metadata: {
          marker: "needle",
          nested: { traceId: "trace_first" }
        }
      });
      const second = writeAuditLog({
        workspaceId: "ws_demo",
        userId: "user_editor",
        action: "audit.test.second",
        entityType: "AuditFixture",
        entityId: "fixture_002",
        summary: "审计筛选测试二",
        metadata: {
          marker: "needle",
          nested: { traceId: "trace_second" }
        }
      });
      writeAuditLog({
        workspaceId: "ws_brand",
        userId: "user_owner",
        action: "audit.test.first",
        entityType: "AuditFixture",
        entityId: "fixture_cross_workspace",
        summary: "跨 workspace 记录",
        metadata: { marker: "needle" }
      });

      expect(
        parseAuditLogFilters({
          action: " audit.test.first ",
          entityType: "AuditFixture",
          userId: " user_owner ",
          q: " needle "
        })
      ).toEqual({
        action: "audit.test.first",
        entityType: "AuditFixture",
        userId: "user_owner",
        q: "needle",
        from: undefined,
        to: undefined,
        limit: undefined
      });
      expect(parseAuditLogFilters({ from: "invalid", to: to, limit: "999" })).toEqual({
        action: undefined,
        entityType: undefined,
        userId: undefined,
        q: undefined,
        from: undefined,
        to,
        limit: 100
      });

      const filtered = listAuditLogs("ws_demo", {
        action: "audit.test.first",
        entityType: "AuditFixture",
        userId: "user_owner",
        q: "trace_first",
        from,
        to
      });
      expect(filtered).toEqual([first]);
      expect(listAuditLogs("ws_demo", { entityType: "AuditFixture", q: "needle", limit: 1 })).toEqual([second]);
      expect(listAuditLogs("ws_demo", { entityType: "AuditFixture", userId: "user_editor" })).toEqual([second]);
      expect(listAuditLogs("ws_brand", { entityType: "AuditFixture" })).not.toContainEqual(first);
    } finally {
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });

  it("exports redacted audit log snapshots and records the export", () => {
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const log = writeAuditLog({
        workspaceId: "ws_demo",
        userId: "user_owner",
        action: "audit.secret.fixture",
        entityType: "AuditFixture",
        entityId: "fixture_secret",
        summary: "导出脱敏测试",
        metadata: {
          apiKey: "sk-test",
          nested: {
            refreshToken: "refresh-token",
            kept: "visible"
          }
        }
      });
      const snapshot = exportAuditLogSnapshot({
        workspaceId: "ws_demo",
        userId: "user_owner",
        filters: {
          action: "audit.secret.fixture",
          userId: "user_owner"
        }
      });

      expect(snapshot).toMatchObject({
        schemaVersion: "contentos.auditLogExport.v1",
        workspaceId: "ws_demo",
        filters: {
          action: "audit.secret.fixture",
          userId: "user_owner"
        },
        itemCount: 1,
        logs: [
          {
            id: log.id,
            action: "audit.secret.fixture",
            metadata: {
              apiKey: "[REDACTED]",
              nested: {
                refreshToken: "[REDACTED]",
                kept: "visible"
              }
            }
          }
        ]
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "audit_log.export",
        entityType: "AuditLog",
        metadata: {
          itemCount: 1,
          schemaVersion: "contentos.auditLogExport.v1",
          filters: {
            action: "audit.secret.fixture",
            userId: "user_owner"
          }
        }
      });
    } finally {
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });

  it("exports redacted audit logs as escaped CSV and records the export", () => {
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      writeAuditLog({
        workspaceId: "ws_demo",
        userId: "user_owner",
        action: "audit.csv.fixture",
        entityType: "AuditFixture",
        entityId: "fixture_csv",
        summary: "CSV \"quoted\", row\nnext",
        metadata: {
          apiKey: "sk-test",
          nested: {
            refreshToken: "refresh-token",
            kept: "visible"
          }
        }
      });

      const csvExport = exportAuditLogCsv({
        workspaceId: "ws_demo",
        userId: "user_owner",
        filters: {
          action: "audit.csv.fixture",
          userId: "user_owner"
        }
      });

      expect(csvExport).toMatchObject({
        schemaVersion: "contentos.auditLogCsvExport.v1",
        workspaceId: "ws_demo",
        filters: {
          action: "audit.csv.fixture",
          userId: "user_owner"
        },
        itemCount: 1
      });
      expect(csvExport.content).toMatch(
        /^id,createdAt,workspaceId,userId,action,entityType,entityId,summary,metadata\n/
      );
      expect(csvExport.content).toContain("audit.csv.fixture");
      expect(csvExport.content).toContain("\"CSV \"\"quoted\"\", row\nnext\"");
      expect(csvExport.content).toContain("\"\"apiKey\"\":\"\"[REDACTED]\"\"");
      expect(csvExport.content).toContain("\"\"refreshToken\"\":\"\"[REDACTED]\"\"");
      expect(csvExport.content).toContain("\"\"kept\"\":\"\"visible\"\"");
      expect(csvExport.content).not.toContain("sk-test");
      expect(csvExport.content).not.toContain("refresh-token");
      expect(store.auditLogs[0]).toMatchObject({
        action: "audit_log.export",
        entityType: "AuditLog",
        metadata: {
          itemCount: 1,
          schemaVersion: "contentos.auditLogCsvExport.v1",
          format: "csv",
          filters: {
            action: "audit.csv.fixture",
            userId: "user_owner"
          }
        }
      });
    } finally {
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });
});
