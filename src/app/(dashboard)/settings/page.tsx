import { Download, KeyRound, Search, Settings2 } from "lucide-react";
import { ApiKeyCreateAction, ApiKeyRevokeAction } from "@/components/settings/api-key-actions";
import { DataRetentionPolicyAction } from "@/components/settings/data-retention-policy-action";
import { NotificationReadAction } from "@/components/settings/notification-read-action";
import { SystemPolicyRefreshAction } from "@/components/settings/system-policy-action";
import { WebhookCreateAction, WebhookToggleAction } from "@/components/settings/webhook-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { Table, Td, Th } from "@/components/ui/table";
import { listAuditLogs, parseAuditLogFilters } from "@/server/audit/audit-service";
import { promptTemplates } from "@/server/ai/prompts/templates";
import { getCurrentUser, getCurrentWorkspaceId } from "@/server/auth/session";
import { listPublicErrorLogs } from "@/server/observability/error-log-service";
import { store } from "@/server/services/mock-store";
import { listNotifications } from "@/server/services/notification-service";
import { listBrandProfiles } from "@/server/services/persona-service";
import {
  getSystemSetting,
  getUsageSummary,
  listApiKeys,
  listSystemSettings,
  listWebhookEndpoints
} from "@/server/services/settings-service";

type DataRetentionPolicy = {
  metricDays?: number;
  auditDays?: number;
  authorizationCacheDays?: number;
  errorLogDays?: number;
};

type SettingsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function formatRetentionDays(days?: number) {
  return typeof days === "number" ? `${days} 天` : "-";
}

function getSearchParamValue(searchParams: SettingsPageProps["searchParams"], key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function getAuditExportHref(filters: ReturnType<typeof parseAuditLogFilters>) {
  const params = new URLSearchParams({ format: "export", limit: String(filters.limit ?? 50) });
  if (filters.action) {
    params.set("action", filters.action);
  }
  if (filters.entityType) {
    params.set("entityType", filters.entityType);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }
  return `/api/audit-logs?${params.toString()}`;
}

export default function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = getCurrentUser();
  const workspaceId = getCurrentWorkspaceId();
  const workspace = store.workspaces.find((item) => item.id === workspaceId);
  const brandProfiles = listBrandProfiles(workspaceId);
  const activeBrand = brandProfiles[0];
  const auditFilters = parseAuditLogFilters({
    action: getSearchParamValue(searchParams, "auditAction"),
    entityType: getSearchParamValue(searchParams, "auditEntityType"),
    q: getSearchParamValue(searchParams, "auditQ"),
    limit: getSearchParamValue(searchParams, "auditLimit") ?? 20
  });
  const allAuditLogs = listAuditLogs(workspaceId);
  const logs = listAuditLogs(workspaceId, auditFilters);
  const auditExportHref = getAuditExportHref(auditFilters);
  const auditActionOptions = Array.from(new Set(allAuditLogs.map((log) => log.action))).sort();
  const auditEntityOptions = Array.from(new Set(allAuditLogs.map((log) => log.entityType))).sort();
  const apiKeys = listApiKeys(workspaceId);
  const webhooks = listWebhookEndpoints(workspaceId);
  const usageSummary = getUsageSummary(workspaceId);
  const systemSettings = listSystemSettings(workspaceId);
  const dataRetentionPolicy = getSystemSetting<DataRetentionPolicy>(workspaceId, "data_retention_policy")?.value;
  const notifications = listNotifications(workspaceId, user.id);
  const errorLogs = listPublicErrorLogs(workspaceId, 6);

  return (
    <>
      <PageHeading
        eyebrow="Settings"
        title="设置"
        description="集中管理 workspace、品牌、AI 模型、数据保留策略、审计日志、API Key 和 webhook 预留。"
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Workspace 设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">名称</span>
              <span className="font-medium">{workspace?.name ?? workspaceId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">组织</span>
              <span className="font-medium">{workspace?.organizationName ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">计划</span>
              <Badge tone="info">{workspace?.currentPlan ?? "MVP Team"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>品牌设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">当前品牌</span>
              <span className="truncate font-medium">{activeBrand?.name ?? "未配置"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">行业</span>
              <span className="truncate font-medium">{activeBrand?.industry ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">档案数</span>
              <Badge tone="info">{brandProfiles.length}</Badge>
            </div>
            <p className="line-clamp-2 text-muted-foreground">
              {activeBrand?.positioning ?? "品牌档案会约束人设、选题和内容生成。"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI 模型设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-medium">AI Provider：mock</span>
            </div>
            <p>真实模型接入通过 provider 抽象扩展，业务层只调用 generateText、generateStructuredObject、embedText、rerank、summarize、classifyRisk。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Key / Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-medium">可运行预留层</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-muted px-3 py-2">
                <div className="text-xs">API Key</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{apiKeys.length}</div>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <div className="text-xs">Webhook</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{webhooks.length}</div>
              </div>
            </div>
            <p>ApiKey、WebhookEndpoint、UsageEvent 和 CreditLedger 已进入 mock 运行层，可通过 API 和审计日志验证。</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
            <CardTitle>系统设置</CardTitle>
            <SystemPolicyRefreshAction />
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>Key</Th>
                  <Th>作用域</Th>
                  <Th>值</Th>
                </tr>
              </thead>
              <tbody>
                {systemSettings.map((setting) => (
                  <tr key={setting.id}>
                    <Td className="font-medium">{setting.key}</Td>
                    <Td>{setting.workspaceId ? "Workspace" : "Global"}</Td>
                    <Td className="max-w-[360px] text-xs leading-5 text-muted-foreground">
                      {JSON.stringify(setting.value)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
              <CardTitle>数据保留策略</CardTitle>
              <DataRetentionPolicyAction />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-muted px-3 py-2">
                  <div className="text-xs text-muted-foreground">指标数据</div>
                  <div className="mt-1 font-semibold">{formatRetentionDays(dataRetentionPolicy?.metricDays)}</div>
                </div>
                <div className="rounded-md bg-muted px-3 py-2">
                  <div className="text-xs text-muted-foreground">审计日志</div>
                  <div className="mt-1 font-semibold">{formatRetentionDays(dataRetentionPolicy?.auditDays)}</div>
                </div>
                <div className="rounded-md bg-muted px-3 py-2">
                  <div className="text-xs text-muted-foreground">授权缓存</div>
                  <div className="mt-1 font-semibold">
                    {formatRetentionDays(dataRetentionPolicy?.authorizationCacheDays)}
                  </div>
                </div>
                <div className="rounded-md bg-muted px-3 py-2">
                  <div className="text-xs text-muted-foreground">错误日志</div>
                  <div className="mt-1 font-semibold">{formatRetentionDays(dataRetentionPolicy?.errorLogDays)}</div>
                </div>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                策略来自 SystemSetting，可通过设置 API 写入 workspace 覆盖值。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>通知中心</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{notification.title}</div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.body}</p>
                    </div>
                    {notification.readAt ? <Badge tone="neutral">已读</Badge> : <Badge tone="warning">未读</Badge>}
                  </div>
                  <div className="mt-3">
                    <NotificationReadAction
                      notificationId={notification.id}
                      title={notification.title}
                      read={Boolean(notification.readAt)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
            <CardTitle>API Key</CardTitle>
            <ApiKeyCreateAction nextName={`MVP 操作 Key ${apiKeys.length + 1}`} />
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>名称</Th>
                  <Th>Key</Th>
                  <Th>状态</Th>
                  <Th>最近使用</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((apiKey) => (
                  <tr key={apiKey.id}>
                    <Td className="font-medium">{apiKey.name}</Td>
                    <Td>{apiKey.keyPreview}</Td>
                    <Td>
                      <Badge tone={apiKey.deletedAt ? "danger" : "success"}>
                        {apiKey.deletedAt ? "已撤销" : "可用"}
                      </Badge>
                    </Td>
                    <Td>{apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString("zh-CN") : "-"}</Td>
                    <Td>
                      <ApiKeyRevokeAction
                        apiKeyId={apiKey.id}
                        apiKeyName={apiKey.name}
                        revoked={Boolean(apiKey.deletedAt)}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
            <CardTitle>用量与额度</CardTitle>
            <Badge tone="info">余额 {usageSummary.creditBalance}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md bg-muted px-3 py-2">
                <div className="text-xs text-muted-foreground">事件用量</div>
                <div className="mt-1 text-xl font-semibold">{usageSummary.usageTotal}</div>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <div className="text-xs text-muted-foreground">账本条目</div>
                <div className="mt-1 text-xl font-semibold">{usageSummary.creditLedger.length}</div>
              </div>
            </div>
            <div className="space-y-2">
              {usageSummary.creditLedger.slice(0, 4).map((entry) => (
                <div key={entry.id} className="rounded-md border border-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{entry.reason}</span>
                    <Badge tone={entry.delta >= 0 ? "success" : "warning"}>{entry.delta}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">余额：{entry.balance}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">最近用量事件</div>
              {usageSummary.usageEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-foreground">{event.eventType}</span>
                    <Badge>{event.quantity}</Badge>
                  </div>
                  <div className="mt-1 truncate">{JSON.stringify(event.metadata ?? {})}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
            <CardTitle>Webhook</CardTitle>
            <WebhookCreateAction nextName={`Webhook ${webhooks.length + 1}`} />
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>名称</Th>
                  <Th>URL</Th>
                  <Th>事件</Th>
                  <Th>状态</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((webhook) => (
                  <tr key={webhook.id}>
                    <Td className="font-medium">{webhook.name}</Td>
                    <Td>{webhook.url}</Td>
                    <Td>{webhook.events.join(", ")}</Td>
                    <Td>
                      <Badge tone={webhook.enabled ? "success" : "neutral"}>
                        {webhook.enabled ? "启用" : "停用"}
                      </Badge>
                    </Td>
                    <Td>
                      <WebhookToggleAction
                        webhookId={webhook.id}
                        webhookName={webhook.name}
                        enabled={webhook.enabled}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card id="audit">
          <CardHeader className="flex items-start justify-between gap-3 sm:flex-row">
            <div>
              <CardTitle>审计日志</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">当前筛选 {logs.length} 条，默认保留最近 20 条。</p>
            </div>
            <a
              href={auditExportHref}
              className="focus-ring inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              导出 JSON
            </a>
          </CardHeader>
          <CardContent className="space-y-3">
            <form aria-label="审计日志筛选" className="grid gap-2 lg:grid-cols-[1fr_1fr_1.4fr_92px_auto]">
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>动作</span>
                <select
                  name="auditAction"
                  defaultValue={auditFilters.action ?? ""}
                  className="focus-ring h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                >
                  <option value="">全部动作</option>
                  {auditActionOptions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>对象</span>
                <select
                  name="auditEntityType"
                  defaultValue={auditFilters.entityType ?? ""}
                  className="focus-ring h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                >
                  <option value="">全部对象</option>
                  {auditEntityOptions.map((entityType) => (
                    <option key={entityType} value={entityType}>
                      {entityType}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>关键词</span>
                <input
                  name="auditQ"
                  defaultValue={auditFilters.q ?? ""}
                  placeholder="搜索摘要、对象 ID 或 metadata"
                  className="focus-ring h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>条数</span>
                <input
                  name="auditLimit"
                  defaultValue={auditFilters.limit ?? 20}
                  min={1}
                  max={100}
                  type="number"
                  className="focus-ring h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm" variant="secondary">
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  筛选
                </Button>
                <a
                  href="/settings#audit"
                  className="focus-ring inline-flex h-8 items-center justify-center rounded-md border border-transparent px-2 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                >
                  重置
                </a>
              </div>
            </form>

            {logs.length > 0 ? (
              <Table>
                <thead>
                  <tr>
                    <Th>动作</Th>
                    <Th>对象</Th>
                    <Th>摘要</Th>
                    <Th>时间</Th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <Td className="font-medium">{log.action}</Td>
                      <Td>{log.entityType}</Td>
                      <Td>{log.summary}</Td>
                      <Td>{new Date(log.createdAt).toLocaleString("zh-CN")}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">未找到匹配的审计日志</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API 错误日志</CardTitle>
          </CardHeader>
          <CardContent>
            {errorLogs.length > 0 ? (
              <Table>
                <thead>
                  <tr>
                    <Th>状态</Th>
                    <Th>接口</Th>
                    <Th>错误</Th>
                    <Th>时间</Th>
                  </tr>
                </thead>
                <tbody>
                  {errorLogs.map((log) => (
                    <tr key={log.id}>
                      <Td>
                        <Badge tone={log.status >= 500 ? "danger" : "warning"}>{log.status}</Badge>
                      </Td>
                      <Td>
                        <div className="text-xs font-medium text-foreground">{log.method}</div>
                        <div className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">{log.route}</div>
                      </Td>
                      <Td>
                        <div className="max-w-[260px] truncate text-sm font-medium">{log.publicMessage}</div>
                        <div className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">
                          {log.errorName}: {log.errorMessage}
                        </div>
                        {log.hasStack ? <div className="mt-1 text-xs text-muted-foreground">已记录堆栈</div> : null}
                      </Td>
                      <Td>{new Date(log.createdAt).toLocaleString("zh-CN")}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">暂无 API 错误记录</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompt 模板版本</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {promptTemplates.map((template) => (
              <div key={template.name} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{template.name}</span>
                  <Badge>v{template.version}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{template.userPrompt}</p>
              </div>
            ))}
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              当前用户：{user.email}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
