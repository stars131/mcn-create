import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mockCookieValues = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => {
      const value = mockCookieValues.get(name);
      return value ? { name, value } : undefined;
    }
  })
}));

import { GET } from "@/app/api/audit-logs/route";
import { authCookieName, workspaceCookieName } from "@/server/auth/session";
import { writeAuditLog } from "@/server/audit/audit-service";
import { store } from "@/server/services/mock-store";

type AuditApiLog = {
  action: string;
  metadata?: Record<string, unknown>;
};

function setMockSession(userId = "user_owner", workspaceId = "ws_demo") {
  mockCookieValues.clear();
  mockCookieValues.set(authCookieName, `mock:${userId}`);
  mockCookieValues.set(workspaceCookieName, workspaceId);
}

function auditRequest(path: string) {
  return {
    method: "GET",
    nextUrl: new URL(`https://contentos.local${path}`),
    headers: new Headers({
      "x-request-id": "req_audit_api_redaction"
    })
  } as unknown as NextRequest;
}

describe("audit log API", () => {
  it("redacts sensitive metadata from list and paginated JSON responses", async () => {
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));
    setMockSession();

    try {
      const log = writeAuditLog({
        workspaceId: "ws_demo",
        userId: "user_owner",
        action: "audit.api_redaction.fixture",
        entityType: "AuditFixture",
        entityId: "fixture_audit_api_redaction",
        summary: "审计 API 脱敏测试",
        metadata: {
          apiKey: "sk-api-secret",
          nested: {
            refreshToken: "refresh-api-secret",
            kept: "visible"
          },
          list: [
            {
              secretHash: "hash-api-secret",
              marker: "kept"
            }
          ]
        }
      });

      const listResponse = await GET(auditRequest("/api/audit-logs?action=audit.api_redaction.fixture&limit=5"));
      expect(listResponse.ok).toBe(true);
      const listPayload = (await listResponse.json()) as { data: AuditApiLog[] };
      expect(listPayload.data).toHaveLength(1);
      expect(listPayload.data[0]).toMatchObject({
        action: log.action,
        metadata: {
          apiKey: "[REDACTED]",
          nested: {
            refreshToken: "[REDACTED]",
            kept: "visible"
          },
          list: [
            {
              secretHash: "[REDACTED]",
              marker: "kept"
            }
          ]
        }
      });
      expect(JSON.stringify(listPayload)).not.toContain("sk-api-secret");
      expect(JSON.stringify(listPayload)).not.toContain("refresh-api-secret");
      expect(JSON.stringify(listPayload)).not.toContain("hash-api-secret");

      const pageResponse = await GET(
        auditRequest("/api/audit-logs?action=audit.api_redaction.fixture&page=1&pageSize=1")
      );
      expect(pageResponse.ok).toBe(true);
      const pagePayload = (await pageResponse.json()) as {
        data: {
          items: AuditApiLog[];
          page: number;
          pageSize: number;
          total: number;
        };
      };
      expect(pagePayload.data).toMatchObject({
        page: 1,
        pageSize: 1,
        total: 1
      });
      expect(pagePayload.data.items[0].metadata).toMatchObject({
        apiKey: "[REDACTED]",
        nested: {
          refreshToken: "[REDACTED]",
          kept: "visible"
        }
      });
      expect(JSON.stringify(pagePayload)).not.toContain("sk-api-secret");
      expect(JSON.stringify(pagePayload)).not.toContain("refresh-api-secret");
      expect(JSON.stringify(pagePayload)).not.toContain("hash-api-secret");
    } finally {
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
      mockCookieValues.clear();
    }
  });
});
