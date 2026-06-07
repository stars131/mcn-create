import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/errors";
import { store } from "@/server/services/mock-store";
import {
  createDataSource,
  deleteAuthorizationData,
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
    }
  });

  it("revokes authorization data and prevents syncing revoked sources", async () => {
    let createdId: string | undefined;

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

      await expect(
        deleteAuthorizationData({ workspaceId: "ws_private", userId: "user_owner", id: source.id })
      ).rejects.toMatchObject({ status: 404 });

      await expect(
        deleteAuthorizationData({ workspaceId: "ws_demo", userId: "user_owner", id: source.id })
      ).resolves.toEqual({ ok: true });
      expect(source.authorizationStatus).toBe("REVOKED");
      expect(source.notes).toBe("授权数据已删除，保留最小审计记录。");
      expect(() => syncDataSource({ workspaceId: "ws_demo", userId: "user_owner", id: source.id })).toThrow(
        "数据源授权已撤销，无法同步"
      );
    } finally {
      if (createdId) {
        store.dataSources = store.dataSources.filter((source) => source.id !== createdId);
        store.auditLogs = store.auditLogs.filter((log) => log.entityId !== createdId);
      }
    }
  });
});
