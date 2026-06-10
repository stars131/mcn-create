import { describe, expect, it } from "vitest";
import {
  exportAuditLogCsv,
  exportAuditLogSnapshot,
  listAuditLogPage,
  listAuditLogs,
  parseAuditLogFilters,
  pruneAuditLogsByRetentionPolicy,
  publicAuditLog,
  publicAuditLogPage,
  publicAuditLogs,
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
        limit: undefined,
        page: undefined,
        pageSize: undefined
      });
      expect(parseAuditLogFilters({ from: "invalid", to: to, limit: "999", page: "0", pageSize: "999" })).toEqual({
        action: undefined,
        entityType: undefined,
        userId: undefined,
        q: undefined,
        from: undefined,
        to,
        limit: 100,
        page: 1,
        pageSize: 100
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

  it("paginates filtered audit logs with total counts and workspace isolation", () => {
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));
    const baseTime = Date.now();

    try {
      const logs = Array.from({ length: 5 }, (_, index) => {
        const log = writeAuditLog({
          workspaceId: "ws_demo",
          userId: index % 2 === 0 ? "user_owner" : "user_editor",
          action: "audit.page.fixture",
          entityType: "AuditPageFixture",
          entityId: `fixture_page_${index + 1}`,
          summary: `分页测试 ${index + 1}`,
          metadata: { marker: "audit-page" }
        });
        log.createdAt = new Date(baseTime + index * 1000).toISOString();
        return log;
      });
      const crossWorkspace = writeAuditLog({
        workspaceId: "ws_brand",
        userId: "user_owner",
        action: "audit.page.fixture",
        entityType: "AuditPageFixture",
        entityId: "fixture_page_cross_workspace",
        summary: "跨 workspace 分页测试",
        metadata: { marker: "audit-page" }
      });
      crossWorkspace.createdAt = new Date(baseTime + 10_000).toISOString();

      const firstPage = listAuditLogPage("ws_demo", {
        entityType: "AuditPageFixture",
        page: 1,
        pageSize: 2
      });
      expect(firstPage).toMatchObject({
        total: 5,
        page: 1,
        pageSize: 2,
        pageCount: 3,
        hasPreviousPage: false,
        hasNextPage: true
      });
      expect(firstPage.items.map((log) => log.summary)).toEqual(["分页测试 5", "分页测试 4"]);

      const lastPage = listAuditLogPage("ws_demo", {
        entityType: "AuditPageFixture",
        page: 99,
        pageSize: 2
      });
      expect(lastPage).toMatchObject({
        total: 5,
        page: 3,
        pageSize: 2,
        pageCount: 3,
        hasPreviousPage: true,
        hasNextPage: false
      });
      expect(lastPage.items).toEqual([logs[0]]);

      const ownerPage = listAuditLogPage("ws_demo", {
        entityType: "AuditPageFixture",
        userId: "user_owner",
        page: 1,
        pageSize: 10
      });
      expect(ownerPage.total).toBe(3);
      expect(ownerPage.items.every((log) => log.userId === "user_owner")).toBe(true);
      expect(listAuditLogPage("ws_brand", { entityType: "AuditPageFixture" }).items).toEqual([crossWorkspace]);
    } finally {
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });

  it("prunes expired workspace audit logs by retention policy and records the cleanup", () => {
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));
    const beforeSystemSettings = [...store.systemSettings];
    const now = new Date("2026-06-10T00:00:00.000Z");

    try {
      store.systemSettings.unshift({
        id: "system_setting_audit_retention_test",
        workspaceId: "ws_demo",
        key: "data_retention_policy",
        value: {
          auditDays: 30
        },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });

      const expired = writeAuditLog({
        workspaceId: "ws_demo",
        userId: "user_owner",
        action: "audit.retention.expired",
        entityType: "AuditFixture",
        summary: "过期审计日志",
        metadata: {
          apiKey: "sk-expired"
        }
      });
      expired.createdAt = "2026-05-01T00:00:00.000Z";

      const retained = writeAuditLog({
        workspaceId: "ws_demo",
        userId: "user_owner",
        action: "audit.retention.retained",
        entityType: "AuditFixture",
        summary: "保留审计日志"
      });
      retained.createdAt = "2026-06-01T00:00:00.000Z";

      const crossWorkspace = writeAuditLog({
        workspaceId: "ws_brand",
        userId: "user_owner",
        action: "audit.retention.expired",
        entityType: "AuditFixture",
        summary: "其他 workspace 过期审计日志"
      });
      crossWorkspace.createdAt = "2026-05-01T00:00:00.000Z";

      const result = pruneAuditLogsByRetentionPolicy({
        workspaceId: "ws_demo",
        userId: "user_owner",
        now
      });

      expect(result).toMatchObject({
        workspaceId: "ws_demo",
        auditDays: 30,
        cutoffAt: "2026-05-11T00:00:00.000Z",
        prunedCount: 1
      });
      expect(store.auditLogs).not.toContainEqual(expired);
      expect(store.auditLogs).toContainEqual(retained);
      expect(store.auditLogs).toContainEqual(crossWorkspace);
      expect(store.auditLogs[0]).toMatchObject({
        workspaceId: "ws_demo",
        userId: "user_owner",
        action: "audit_log.retention_prune",
        entityType: "AuditLog",
        summary: "执行审计日志保留清理：删除 1 条",
        metadata: {
          auditDays: 30,
          cutoffAt: "2026-05-11T00:00:00.000Z",
          prunedCount: 1
        }
      });
      expect(JSON.stringify(store.auditLogs[0].metadata)).not.toContain("sk-expired");

      const emptyResult = pruneAuditLogsByRetentionPolicy({
        workspaceId: "ws_demo",
        userId: "user_owner",
        now
      });
      expect(emptyResult.prunedCount).toBe(0);
      expect(store.auditLogs[0]).toMatchObject({
        action: "audit_log.retention_prune",
        summary: "执行审计日志保留清理：删除 0 条",
        metadata: {
          prunedCount: 0
        }
      });
    } finally {
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
      store.systemSettings = beforeSystemSettings;
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

  it("redacts public audit log metadata recursively without mutating stored logs", () => {
    const beforeAuditLogIds = new Set(store.auditLogs.map((item) => item.id));

    try {
      const log = writeAuditLog({
        workspaceId: "ws_demo",
        userId: "user_owner",
        action: "audit.public_redaction.fixture",
        entityType: "AuditFixture",
        entityId: "fixture_public_redaction",
        summary: "公共审计脱敏测试",
        metadata: {
          apiKey: "sk-test",
          tokenRef: "vault://token",
          nested: {
            refreshToken: "refresh-token",
            webhookSecret: "webhook-secret",
            kept: "visible"
          },
          list: [
            {
              secretHash: "hash-secret",
              marker: "kept"
            }
          ]
        }
      });

      const redacted = publicAuditLog(log);
      const redactedList = publicAuditLogs([log]);
      const redactedPage = publicAuditLogPage({
        items: [log],
        total: 1,
        page: 1,
        pageSize: 20,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false
      });

      expect(redacted.metadata).toEqual({
        apiKey: "[REDACTED]",
        tokenRef: "[REDACTED]",
        nested: {
          refreshToken: "[REDACTED]",
          webhookSecret: "[REDACTED]",
          kept: "visible"
        },
        list: [
          {
            secretHash: "[REDACTED]",
            marker: "kept"
          }
        ]
      });
      expect(redactedList[0].metadata).toEqual(redacted.metadata);
      expect(redactedPage.items[0].metadata).toEqual(redacted.metadata);
      expect(log.metadata).toMatchObject({
        apiKey: "sk-test",
        tokenRef: "vault://token",
        nested: {
          refreshToken: "refresh-token",
          webhookSecret: "webhook-secret"
        }
      });
    } finally {
      store.auditLogs = store.auditLogs.filter((item) => beforeAuditLogIds.has(item.id));
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
