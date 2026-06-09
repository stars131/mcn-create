import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/errors";
import { store } from "@/server/services/mock-store";
import {
  createDataSource,
  deleteAuthorizationData,
  getPlatformAuthorizationOverview,
  syncDataSource,
  updateDataSource
} from "@/server/services/data-source-service";

describe("data source service", () => {
  it("normalizes created data sources and writes audit logs", () => {
    let createdId: string | undefined;

    try {
      const source = createDataSource({
        workspaceId: "ws_demo",
        userId: "user_owner",
        name: "  CSV Import  ",
        sourceType: "USER_UPLOAD",
        platform: "ALL",
        notes: "  Uploaded by operator  "
      });
      createdId = source.id;

      expect(source).toMatchObject({
        workspaceId: "ws_demo",
        name: "CSV Import",
        notes: "Uploaded by operator",
        authorizationStatus: "MOCKED"
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "data_source.create",
        entityId: source.id
      });
    } finally {
      if (createdId) {
        store.dataSources = store.dataSources.filter((source) => source.id !== createdId);
        store.auditLogs = store.auditLogs.filter((log) => log.entityId !== createdId);
      }
    }
  });

  it("updates only allowed fields inside the active workspace", () => {
    let createdId: string | undefined;
    const beforeAccountIds = new Set(store.platformAccounts.map((account) => account.id));
    const beforeAuthorizationIds = new Set(store.platformAuthorizations.map((authorization) => authorization.id));

    try {
      const source = createDataSource({
        workspaceId: "ws_demo",
        userId: "user_owner",
        name: "Managed Source",
        sourceType: "USER_AUTHORIZED",
        platform: "DOUYIN"
      });
      createdId = source.id;

      const unsafePatch = { name: "  Renamed Source  ", workspaceId: "ws_brand" };
      const updated = updateDataSource({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: source.id,
        patch: unsafePatch
      });

      expect(updated.name).toBe("Renamed Source");
      expect(updated.workspaceId).toBe("ws_demo");
      expect(
        store.platformAccounts.find((account) => !beforeAccountIds.has(account.id) && account.platform === "DOUYIN")
      ).toMatchObject({
        displayName: "Renamed Source",
        status: "MOCKED"
      });
      expect(() =>
        updateDataSource({
          workspaceId: "ws_brand",
          userId: "user_owner",
          id: source.id,
          patch: { name: "Wrong tenant" }
        })
      ).toThrow(ApiError);
    } finally {
      if (createdId) {
        store.dataSources = store.dataSources.filter((source) => source.id !== createdId);
        store.auditLogs = store.auditLogs.filter((log) => log.entityId !== createdId);
      }
      store.platformAccounts = store.platformAccounts.filter((account) => beforeAccountIds.has(account.id));
      store.platformAuthorizations = store.platformAuthorizations.filter((authorization) =>
        beforeAuthorizationIds.has(authorization.id)
      );
    }
  });

  it("revokes authorization data and prevents syncing revoked sources", async () => {
    let createdId: string | undefined;
    const beforeAccountIds = new Set(store.platformAccounts.map((account) => account.id));
    const beforeAuthorizationIds = new Set(store.platformAuthorizations.map((authorization) => authorization.id));

    try {
      const source = createDataSource({
        workspaceId: "ws_demo",
        userId: "user_owner",
        name: "OAuth Source",
        sourceType: "USER_AUTHORIZED",
        platform: "XIAOHONGSHU",
        authorizationStatus: "CONNECTED"
      });
      createdId = source.id;
      const account = store.platformAccounts.find(
        (item) => !beforeAccountIds.has(item.id) && item.workspaceId === "ws_demo"
      );
      const authorization = store.platformAuthorizations.find(
        (item) => !beforeAuthorizationIds.has(item.id) && item.workspaceId === "ws_demo"
      );

      expect(account).toMatchObject({
        platform: "XIAOHONGSHU",
        displayName: "OAuth Source",
        status: "CONNECTED"
      });
      expect(authorization).toMatchObject({
        platformAccountId: account?.id,
        authorizationStatus: "CONNECTED",
        scopes: expect.arrayContaining(["read_metrics", "read_comments"]),
        tokenRef: expect.stringContaining(source.id)
      });
      expect(getPlatformAuthorizationOverview("ws_demo").authorizations[0]).not.toHaveProperty("tokenRef");
      expect(getPlatformAuthorizationOverview("ws_demo").authorizations[0]).toHaveProperty("hasTokenRef");

      await expect(
        deleteAuthorizationData({ workspaceId: "ws_private", userId: "user_owner", id: source.id })
      ).rejects.toMatchObject({ status: 404 });

      await expect(
        deleteAuthorizationData({ workspaceId: "ws_demo", userId: "user_owner", id: source.id })
      ).resolves.toEqual({ ok: true });
      expect(source.authorizationStatus).toBe("REVOKED");
      expect(source.notes).toBe("授权数据已删除，保留最小审计记录。");
      expect(store.auditLogs[0]).toMatchObject({
        action: "data_source.authorization.delete",
        entityType: "DataSource",
        entityId: source.id,
        summary: "删除平台授权数据：OAuth Source",
        metadata: {
          sourceName: "OAuth Source",
          sourceType: "USER_AUTHORIZED",
          platform: "XIAOHONGSHU",
          previousAuthorizationStatus: "CONNECTED",
          authorizationStatus: "REVOKED",
          platformAccountId: account?.id,
          platformAuthorizationId: authorization?.id,
          previousPlatformAuthorizationId: authorization?.id,
          hadTokenRef: true,
          tokenRefRemoved: true,
          retainedAuditRecord: true
        }
      });
      expect(store.auditLogs[0].metadata).not.toHaveProperty("tokenRef");
      expect(account).toMatchObject({
        status: "REVOKED"
      });
      expect(authorization).toMatchObject({
        authorizationStatus: "REVOKED",
        tokenRef: undefined
      });
      expect(authorization?.revokedAt).toBeTruthy();
      expect(() => syncDataSource({ workspaceId: "ws_demo", userId: "user_owner", id: source.id })).toThrow(
        "数据源授权已撤销，无法同步"
      );
    } finally {
      if (createdId) {
        store.dataSources = store.dataSources.filter((source) => source.id !== createdId);
        store.auditLogs = store.auditLogs.filter((log) => log.entityId !== createdId);
      }
      store.platformAccounts = store.platformAccounts.filter((account) => beforeAccountIds.has(account.id));
      store.platformAuthorizations = store.platformAuthorizations.filter((authorization) =>
        beforeAuthorizationIds.has(authorization.id)
      );
    }
  });
});
