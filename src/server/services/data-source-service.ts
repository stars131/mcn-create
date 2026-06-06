import { writeAuditLog } from "@/server/audit/audit-service";
import { mockPlatformAdapter } from "@/server/platforms/mock/mock-platform-adapter";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { AuthorizationStatus, DataSource, Platform, SourceType } from "@/types/domain";

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
  const dataSource: DataSource = {
    id: nextId("source"),
    workspaceId: input.workspaceId,
    name: input.name,
    sourceType: input.sourceType,
    platform: input.platform,
    authorizationStatus: input.authorizationStatus ?? "MOCKED",
    lastSyncedAt: new Date().toISOString(),
    notes: input.notes ?? "通过数据源 Adapter 创建。"
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
  patch: Partial<DataSource>;
}) {
  const source = getWorkspaceScoped(store.dataSources, input.workspaceId).find((item) => item.id === input.id);
  if (!source) {
    throw new Error("数据源不存在");
  }
  Object.assign(source, input.patch);
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
  const source = getWorkspaceScoped(store.dataSources, input.workspaceId).find((item) => item.id === input.id);
  if (!source) {
    throw new Error("数据源不存在");
  }
  source.lastSyncedAt = new Date().toISOString();
  source.authorizationStatus = source.authorizationStatus === "REVOKED" ? "REVOKED" : "CONNECTED";
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
