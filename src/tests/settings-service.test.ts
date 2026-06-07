import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/errors";
import { store } from "@/server/services/mock-store";
import {
  createApiKey,
  createWebhookEndpoint,
  getUsageSummary,
  recordCreditLedger,
  revokeApiKey,
  updateWebhookEndpoint
} from "@/server/services/settings-service";

describe("settings service", () => {
  it("creates and revokes API keys without exposing hashes", () => {
    let createdId: string | undefined;

    try {
      const result = createApiKey({
        workspaceId: "ws_demo",
        userId: "user_owner",
        name: "  Server Key  "
      });
      createdId = result.apiKey.id;

      expect(result.secret).toMatch(/^cos_/);
      expect(result.apiKey).toMatchObject({
        workspaceId: "ws_demo",
        name: "Server Key"
      });
      expect(result.apiKey).not.toHaveProperty("keyHash");
      expect(result.apiKey.keyPreview).toContain("...");
      expect(store.auditLogs[0]).toMatchObject({
        action: "api_key.create",
        entityId: createdId
      });

      const revoked = revokeApiKey({ workspaceId: "ws_demo", userId: "user_owner", id: createdId });
      expect(revoked.deletedAt).toBeTruthy();
      expect(revoked).not.toHaveProperty("keyHash");
      expect(() => revokeApiKey({ workspaceId: "ws_brand", userId: "user_owner", id: createdId! })).toThrow(
        ApiError
      );
    } finally {
      if (createdId) {
        store.apiKeys = store.apiKeys.filter((apiKey) => apiKey.id !== createdId);
        store.auditLogs = store.auditLogs.filter((log) => log.entityId !== createdId);
      }
    }
  });

  it("creates and toggles webhooks without exposing secret hashes", () => {
    let createdId: string | undefined;

    try {
      const webhook = createWebhookEndpoint({
        workspaceId: "ws_demo",
        userId: "user_owner",
        name: "  Publish Notifier  ",
        url: "https://example.com/webhook",
        events: ["agent.run.success", " content.scheduled "]
      });
      createdId = webhook.id;

      expect(webhook).toMatchObject({
        workspaceId: "ws_demo",
        name: "Publish Notifier",
        enabled: true,
        events: ["agent.run.success", "content.scheduled"]
      });
      expect(webhook).not.toHaveProperty("secretHash");

      const disabled = updateWebhookEndpoint({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: createdId,
        enabled: false
      });
      expect(disabled.enabled).toBe(false);
      expect(disabled).not.toHaveProperty("secretHash");
      expect(() =>
        createWebhookEndpoint({
          workspaceId: "ws_demo",
          userId: "user_owner",
          name: "Invalid",
          url: "ftp://example.com/webhook",
          events: ["agent.run.success"]
        })
      ).toThrow("Webhook URL 必须使用 HTTP 或 HTTPS");
    } finally {
      if (createdId) {
        store.webhookEndpoints = store.webhookEndpoints.filter((webhook) => webhook.id !== createdId);
        store.auditLogs = store.auditLogs.filter((log) => log.entityId !== createdId);
      }
    }
  });

  it("summarizes usage and appends credit ledger balances per workspace", () => {
    let createdId: string | undefined;

    try {
      const before = getUsageSummary("ws_demo");
      const ledger = recordCreditLedger({
        workspaceId: "ws_demo",
        delta: -10,
        reason: "测试扣减",
        metadata: { test: true }
      });
      createdId = ledger.id;

      const after = getUsageSummary("ws_demo");
      expect(after.creditBalance).toBe(before.creditBalance - 10);
      expect(after.creditLedger[0]).toMatchObject({
        id: ledger.id,
        balance: before.creditBalance - 10
      });
      expect(getUsageSummary("ws_brand").creditLedger.some((entry) => entry.id === ledger.id)).toBe(false);
    } finally {
      if (createdId) {
        store.creditLedger = store.creditLedger.filter((entry) => entry.id !== createdId);
      }
    }
  });
});
