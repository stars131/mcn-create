import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import { mockPlatformAdapter } from "@/server/platforms/mock/mock-platform-adapter";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type {
  AuthorizationStatus,
  DataSource,
  Platform,
  PlatformAccount,
  SourceType
} from "@/types/domain";

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

const authorizationSourceTypes: SourceType[] = ["OFFICIAL_API", "USER_AUTHORIZED", "THIRD_PARTY_LEGAL"];

function shouldManagePlatformAuthorization(source: DataSource) {
  return source.platform !== "ALL" && authorizationSourceTypes.includes(source.sourceType);
}

function defaultScopes(platform: Platform) {
  const baseScopes = ["read_profile", "read_metrics"];
  if (platform === "DOUYIN" || platform === "XIAOHONGSHU" || platform === "BILIBILI") {
    return [...baseScopes, "read_comments", "read_hotspots"];
  }
  if (platform === "WECHAT" || platform === "VIDEO_ACCOUNT") {
    return [...baseScopes, "read_comments", "publish_plan"];
  }
  return baseScopes;
}

function platformHandle(source: DataSource) {
  const suffix = source.id.replace(/^source_/, "").toLowerCase();
  return `${source.platform.toLowerCase()}_${suffix}`;
}

function tokenRefForSource(source: DataSource) {
  return `vault://mock/${source.platform.toLowerCase()}/${source.id}`;
}

function findPlatformAccountForSource(source: DataSource) {
  return store.platformAccounts.find(
    (account) =>
      account.workspaceId === source.workspaceId &&
      account.platform === source.platform &&
      (account.displayName === source.name || account.handle === platformHandle(source))
  );
}

function findPlatformAuthorization(account: PlatformAccount) {
  return store.platformAuthorizations.find(
    (authorization) =>
      authorization.workspaceId === account.workspaceId && authorization.platformAccountId === account.id
  );
}

function upsertPlatformAuthorizationForSource(source: DataSource) {
  if (!shouldManagePlatformAuthorization(source)) {
    return {};
  }

  const timestamp = new Date().toISOString();
  let account = findPlatformAccountForSource(source);

  if (!account) {
    account = {
      id: nextId("platform_account"),
      workspaceId: source.workspaceId,
      platform: source.platform,
      handle: platformHandle(source),
      displayName: source.name,
      accountUrl: `mock://${source.platform.toLowerCase()}/accounts/${platformHandle(source)}`,
      status: source.authorizationStatus,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    store.platformAccounts.unshift(account);
  } else {
    account.displayName = source.name;
    account.status = source.authorizationStatus;
    account.updatedAt = timestamp;
  }

  let authorization = findPlatformAuthorization(account);
  const revokedAt = source.authorizationStatus === "REVOKED" ? timestamp : undefined;
  const tokenRef = source.authorizationStatus === "REVOKED" ? undefined : tokenRefForSource(source);

  if (!authorization) {
    authorization = {
      id: nextId("platform_auth"),
      workspaceId: source.workspaceId,
      platformAccountId: account.id,
      platform: source.platform,
      authorizationStatus: source.authorizationStatus,
      scopes: defaultScopes(source.platform),
      tokenRef,
      lastSyncedAt: source.lastSyncedAt,
      revokedAt,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    store.platformAuthorizations.unshift(authorization);
  } else {
    authorization.authorizationStatus = source.authorizationStatus;
    authorization.tokenRef = tokenRef;
    authorization.lastSyncedAt = source.lastSyncedAt;
    authorization.revokedAt = revokedAt;
    authorization.updatedAt = timestamp;
  }

  return { account, authorization };
}

export function listDataSources(workspaceId: string) {
  return mockPlatformAdapter.listDataSources(workspaceId);
}

export function listPlatformAccounts(workspaceId: string) {
  return getWorkspaceScoped(store.platformAccounts, workspaceId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listPlatformAuthorizations(workspaceId: string) {
  return getWorkspaceScoped(store.platformAuthorizations, workspaceId).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function getPlatformAuthorizationOverview(workspaceId: string) {
  const authorizations = listPlatformAuthorizations(workspaceId);
  const publicAuthorizations = authorizations.map(({ tokenRef: _tokenRef, ...authorization }) => ({
    ...authorization,
    hasTokenRef: Boolean(_tokenRef)
  }));

  return {
    accounts: listPlatformAccounts(workspaceId).map((account) => ({
      ...account,
      authorization: publicAuthorizations.find((authorization) => authorization.platformAccountId === account.id)
    })),
    authorizations: publicAuthorizations
  };
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
  const runtime = upsertPlatformAuthorizationForSource(dataSource);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "data_source.create",
    entityType: "DataSource",
    entityId: dataSource.id,
    summary: `创建数据源：${dataSource.name}`,
    metadata: {
      platformAccountId: runtime.account?.id,
      platformAuthorizationId: runtime.authorization?.id
    }
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
  const runtime = upsertPlatformAuthorizationForSource(source);

  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "data_source.update",
    entityType: "DataSource",
    entityId: source.id,
    summary: `更新数据源：${source.name}`,
    metadata: {
      platformAccountId: runtime.account?.id,
      platformAuthorizationId: runtime.authorization?.id
    }
  });
  return source;
}

export async function deleteAuthorizationData(input: { workspaceId: string; userId: string; id: string }) {
  const source = getDataSourceOrThrow(input.workspaceId, input.id);
  await mockPlatformAdapter.deleteAuthorizationData(input.workspaceId, input.id);
  const runtime = upsertPlatformAuthorizationForSource(source);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "data_source.authorization.delete",
    entityType: "DataSource",
    entityId: input.id,
    summary: "删除平台授权数据，保留审计记录",
    metadata: {
      platformAccountId: runtime.account?.id,
      platformAuthorizationId: runtime.authorization?.id
    }
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
  const runtime = upsertPlatformAuthorizationForSource(source);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "data_source.sync",
    entityType: "DataSource",
    entityId: source.id,
    summary: `同步数据源：${source.name}`,
    metadata: {
      platformAccountId: runtime.account?.id,
      platformAuthorizationId: runtime.authorization?.id
    }
  });
  return source;
}
