import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { ApiKey, CreditLedger, UsageEvent, WebhookEndpoint } from "@/types/domain";

export type PublicApiKey = Omit<ApiKey, "keyHash"> & {
  keyPreview: string;
};
export type PublicWebhookEndpoint = Omit<WebhookEndpoint, "secretHash">;

function normalizeName(name: string) {
  const normalized = name.trim();
  if (!normalized) {
    throw new ApiError("名称不能为空", 422);
  }

  return normalized;
}

function getApiKeyOrThrow(workspaceId: string, id: string) {
  const apiKey = getWorkspaceScoped(store.apiKeys, workspaceId).find((item) => item.id === id);
  if (!apiKey) {
    throw new ApiError("API Key 不存在", 404);
  }

  return apiKey;
}

function getWebhookOrThrow(workspaceId: string, id: string) {
  const webhook = getWorkspaceScoped(store.webhookEndpoints, workspaceId).find((item) => item.id === id);
  if (!webhook) {
    throw new ApiError("Webhook 不存在", 404);
  }

  return webhook;
}

function publicApiKey(apiKey: ApiKey): PublicApiKey {
  const { keyHash: _keyHash, ...safeApiKey } = apiKey;
  return {
    ...safeApiKey,
    keyPreview: `${apiKey.keyPrefix}...${apiKey.id.slice(-4)}`
  };
}

function publicWebhookEndpoint(webhook: WebhookEndpoint): PublicWebhookEndpoint {
  const { secretHash: _secretHash, ...safeWebhook } = webhook;
  return safeWebhook;
}

export function listApiKeys(workspaceId: string) {
  return getWorkspaceScoped(store.apiKeys, workspaceId).map(publicApiKey);
}

export function createApiKey(input: { workspaceId: string; userId: string; name: string; expiresAt?: string }) {
  const name = normalizeName(input.name);
  const rawKey = `cos_${crypto.randomUUID().replace(/-/g, "")}`;
  const apiKey: ApiKey = {
    id: nextId("api_key"),
    workspaceId: input.workspaceId,
    name,
    keyPrefix: rawKey.slice(0, 13),
    keyHash: `mock_hash_${rawKey.slice(-16)}`,
    expiresAt: input.expiresAt,
    createdById: input.userId,
    createdAt: new Date().toISOString()
  };
  store.apiKeys.unshift(apiKey);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "api_key.create",
    entityType: "ApiKey",
    entityId: apiKey.id,
    summary: `创建 API Key：${apiKey.name}`
  });

  return { apiKey: publicApiKey(apiKey), secret: rawKey };
}

export function revokeApiKey(input: { workspaceId: string; userId: string; id: string }) {
  const apiKey = getApiKeyOrThrow(input.workspaceId, input.id);
  if (!apiKey.deletedAt) {
    apiKey.deletedAt = new Date().toISOString();
    writeAuditLog({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: "api_key.revoke",
      entityType: "ApiKey",
      entityId: apiKey.id,
      summary: `撤销 API Key：${apiKey.name}`
    });
  }

  return publicApiKey(apiKey);
}

export function listWebhookEndpoints(workspaceId: string) {
  return getWorkspaceScoped(store.webhookEndpoints, workspaceId).map(publicWebhookEndpoint);
}

export function createWebhookEndpoint(input: {
  workspaceId: string;
  userId: string;
  name: string;
  url: string;
  events: string[];
}) {
  const name = normalizeName(input.name);
  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    throw new ApiError("Webhook URL 不合法", 422);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ApiError("Webhook URL 必须使用 HTTP 或 HTTPS", 422);
  }

  const events = input.events.map((event) => event.trim()).filter(Boolean);
  if (events.length === 0) {
    throw new ApiError("Webhook 至少订阅一个事件", 422);
  }

  const now = new Date().toISOString();
  const webhook: WebhookEndpoint = {
    id: nextId("webhook"),
    workspaceId: input.workspaceId,
    name,
    url: url.toString(),
    secretHash: `mock_hash_${crypto.randomUUID().slice(0, 12)}`,
    events,
    enabled: true,
    createdAt: now,
    updatedAt: now
  };
  store.webhookEndpoints.unshift(webhook);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "webhook.create",
    entityType: "WebhookEndpoint",
    entityId: webhook.id,
    summary: `创建 Webhook：${webhook.name}`,
    metadata: { events: webhook.events }
  });

  return publicWebhookEndpoint(webhook);
}

export function updateWebhookEndpoint(input: {
  workspaceId: string;
  userId: string;
  id: string;
  enabled?: boolean;
}) {
  const webhook = getWebhookOrThrow(input.workspaceId, input.id);
  if (input.enabled !== undefined) {
    webhook.enabled = input.enabled;
  }
  webhook.updatedAt = new Date().toISOString();
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "webhook.update",
    entityType: "WebhookEndpoint",
    entityId: webhook.id,
    summary: `${webhook.enabled ? "启用" : "停用"} Webhook：${webhook.name}`
  });

  return publicWebhookEndpoint(webhook);
}

export function listUsageEvents(workspaceId: string) {
  return getWorkspaceScoped(store.usageEvents, workspaceId);
}

export function listCreditLedger(workspaceId: string) {
  return getWorkspaceScoped(store.creditLedger, workspaceId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function recordUsageEvent(input: Omit<UsageEvent, "id" | "createdAt">) {
  const usageEvent: UsageEvent = {
    id: nextId("usage"),
    createdAt: new Date().toISOString(),
    ...input
  };
  store.usageEvents.unshift(usageEvent);
  return usageEvent;
}

export function recordCreditLedger(input: Omit<CreditLedger, "id" | "createdAt" | "balance">) {
  const latest = listCreditLedger(input.workspaceId)[0];
  const balance = (latest?.balance ?? 0) + input.delta;
  const ledger: CreditLedger = {
    id: nextId("credit"),
    balance,
    createdAt: new Date().toISOString(),
    ...input
  };
  store.creditLedger.unshift(ledger);
  return ledger;
}

export function getUsageSummary(workspaceId: string) {
  const usageEvents = listUsageEvents(workspaceId);
  const creditLedger = listCreditLedger(workspaceId);
  const usageTotal = usageEvents.reduce((total, event) => total + event.quantity, 0);
  const creditBalance = creditLedger[0]?.balance ?? 0;

  return {
    usageTotal,
    creditBalance,
    usageEvents,
    creditLedger
  };
}
