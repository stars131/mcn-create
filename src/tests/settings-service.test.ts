import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/errors";
import { createNotification, listNotifications, markNotificationRead } from "@/server/services/notification-service";
import { store } from "@/server/services/mock-store";
import {
  createApiKey,
  createWebhookEndpoint,
  getSystemSetting,
  getUsageSummary,
  listSystemSettings,
  recordCreditLedger,
  revokeApiKey,
  upsertSystemSetting,
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

  it("lists system settings and upserts workspace-scoped values", () => {
    const beforeSettingIds = new Set(store.systemSettings.map((setting) => setting.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const initialSettings = listSystemSettings("ws_demo");
      expect(initialSettings.map((setting) => setting.key)).toEqual(
        expect.arrayContaining(["ai_provider_policy", "data_retention_policy", "risk_review_policy"])
      );
      const globalRetention = getSystemSetting<{ errorLogDays: number }>("ws_demo", "data_retention_policy");
      expect(globalRetention?.workspaceId).toBeUndefined();
      expect(globalRetention?.value).toMatchObject({
        errorLogDays: 90
      });

      const setting = upsertSystemSetting({
        workspaceId: "ws_demo",
        userId: "user_owner",
        key: "content_export_policy",
        value: {
          allowMockExport: true,
          requireAuditLog: true
        }
      });
      const retentionOverride = upsertSystemSetting({
        workspaceId: "ws_demo",
        userId: "user_owner",
        key: "data_retention_policy",
        value: {
          metricDays: 180,
          auditDays: 365,
          authorizationCacheDays: 14,
          errorLogDays: 30
        }
      });

      expect(listSystemSettings("ws_demo")).toContainEqual(setting);
      expect(getSystemSetting<{ metricDays: number; errorLogDays: number }>("ws_demo", "data_retention_policy")).toEqual(
        retentionOverride
      );
      expect(listSystemSettings("ws_brand").some((item) => item.id === setting.id)).toBe(false);
      expect(store.auditLogs.find((log) => log.entityId === setting.id)).toMatchObject({
        action: "system_setting.upsert",
        entityType: "SystemSetting",
        entityId: setting.id,
        metadata: {
          key: "content_export_policy"
        }
      });
    } finally {
      store.systemSettings = store.systemSettings.filter((setting) => beforeSettingIds.has(setting.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });

  it("creates and marks notifications as read per workspace", () => {
    const beforeNotificationIds = new Set(store.notifications.map((notification) => notification.id));

    try {
      const notification = createNotification({
        workspaceId: "ws_demo",
        userId: "user_owner",
        title: "测试通知",
        body: "测试通知正文"
      });

      expect(listNotifications("ws_demo", "user_owner")[0]).toMatchObject({
        id: notification.id,
        title: "测试通知"
      });
      expect(listNotifications("ws_demo", "user_owner")[0].readAt).toBeUndefined();
      expect(listNotifications("ws_brand", "user_owner").some((item) => item.id === notification.id)).toBe(false);

      const read = markNotificationRead("ws_demo", notification.id);
      expect(read).toMatchObject({
        id: notification.id
      });
      expect(read?.readAt).toBeTruthy();
      expect(markNotificationRead("ws_brand", notification.id)).toBeUndefined();
    } finally {
      store.notifications = store.notifications.filter((notification) => beforeNotificationIds.has(notification.id));
    }
  });
});
