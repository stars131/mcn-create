import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import { mockPlatformAdapter } from "@/server/platforms/mock/mock-platform-adapter";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { AuthorizationStatus, DataSource, Platform, SourceType } from "@/types/domain";

type DataSourcePatch = {
  name?: string;
  authorizationStatus?: AuthorizationStatus;
  notes?: string;
};

function getDataSourceOrThrow(workspaceId: string, id: string) {
  const source = getWorkspaceScoped(store.dataSources, workspaceId).find((item) => item.id === id);
  if (!source) {
    throw new ApiError("数据源不存在", 404);
  }

  return source;
}

function normalizeName(name: string) {
  const normalized = name.trim();
  if (!normalized) {
    throw new ApiError("数据源名称不能为空", 422);
  }

  return normalized;
}

export function listDataSources(workspaceId: string) {
  return mockPlatformAdapter.listDataSources(workspaceId);
}

export function createDataSource(input: {
  workspaceId: string;
  userId: string;
  name: string;
  sourceType: SourceType;
  platform: Platform;
  authorizationStatus?: AuthorizationStatus;
  notes?: string;
}) {
  const name = normalizeName(input.name);
  const dataSource: DataSource = {
    id: nextId("source"),
    workspaceId: input.workspaceId,
    name,
    sourceType: input.sourceType,
    platform: input.platform,
    authorizationStatus: input.authorizationStatus ?? "MOCKED",
    lastSyncedAt: new Date().toISOString(),
    notes: input.notes?.trim() || "通过数据源 Adapter 创建。"
  };
  store.dataSources.unshift(dataSource);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "data_source.create",
    entityType: "DataSource",
    entityId: dataSource.id,
    summary: `创建数据源：${dataSource.name}`
  });
  return dataSource;
}

export function updateDataSource(input: {
  workspaceId: string;
  userId: string;
  id: string;
  patch: DataSourcePatch;
}) {
  const source = getDataSourceOrThrow(input.workspaceId, input.id);
  if (input.patch.name !== undefined) {
    source.name = normalizeName(input.patch.name);
  }
  if (input.patch.authorizationStatus !== undefined) {
    source.authorizationStatus = input.patch.authorizationStatus;
  }
  if (input.patch.notes !== undefined) {
    source.notes = input.patch.notes.trim();
  }

  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "data_source.update",
    entityType: "DataSource",
    entityId: source.id,
    summary: `更新数据源：${source.name}`
  });
  return source;
}

export async function deleteAuthorizationData(input: { workspaceId: string; userId: string; id: string }) {
  getDataSourceOrThrow(input.workspaceId, input.id);
  await mockPlatformAdapter.deleteAuthorizationData(input.workspaceId, input.id);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "data_source.authorization.delete",
    entityType: "DataSource",
    entityId: input.id,
    summary: "删除平台授权数据，保留审计记录"
  });
  return { ok: true };
}

export function syncDataSource(input: { workspaceId: string; userId: string; id: string }) {
  const source = getDataSourceOrThrow(input.workspaceId, input.id);
  if (source.authorizationStatus === "REVOKED") {
    throw new ApiError("数据源授权已撤销，无法同步", 409);
  }

  source.lastSyncedAt = new Date().toISOString();
  source.authorizationStatus = "CONNECTED";
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "data_source.sync",
    entityType: "DataSource",
    entityId: source.id,
    summary: `同步数据源：${source.name}`
  });
  return source;
}
