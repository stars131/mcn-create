import { DataSourceCreateForm } from "@/components/data-sources/data-source-create-form";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { Table, Td, Th } from "@/components/ui/table";
import { platformLabels } from "@/lib/constants/navigation";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import { getPlatformAuthorizationOverview, listDataSources } from "@/server/services/data-source-service";

const statusTone = {
  CONNECTED: "success",
  DISCONNECTED: "neutral",
  EXPIRED: "warning",
  REVOKED: "danger",
  MOCKED: "info"
} as const;

export default function DataSourcesPage() {
  const workspaceId = getCurrentWorkspaceId();
  const sources = listDataSources(workspaceId);
  const authorizationOverview = getPlatformAuthorizationOverview(workspaceId);

  return (
    <>
      <PageHeading
        eyebrow="Data Sources"
        title="数据源与平台授权"
        description="平台能力必须通过 adapter 抽象；MVP 只启用 mock、用户上传和模拟连接，不做未经授权的数据抓取。"
        actions={
          <ActionButton
            endpoint="/api/data-sources"
            body={{
              name: "模拟 OAuth 连接",
              sourceType: "USER_AUTHORIZED",
              platform: "DOUYIN",
              authorizationStatus: "CONNECTED",
              notes: "预留官方 OAuth 接入结构，当前为模拟连接。"
            }}
            label="模拟连接"
            pendingLabel="连接中"
            icon="plug"
            variant="primary"
          />
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>平台账号与数据源</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>名称</Th>
                  <Th>平台</Th>
                  <Th>来源类型</Th>
                  <Th>授权状态</Th>
                  <Th>最后同步</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const account = authorizationOverview.accounts.find(
                    (item) => item.platform === source.platform && item.displayName === source.name
                  );

                  return (
                    <tr key={source.id}>
                      <Td>
                        <div className="font-medium">{source.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{source.notes}</div>
                        {account ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            关联账号：{account.displayName}（@{account.handle}）
                          </div>
                        ) : null}
                      </Td>
                      <Td>{platformLabels[source.platform]}</Td>
                      <Td>{source.sourceType}</Td>
                      <Td>
                        <Badge tone={statusTone[source.authorizationStatus]}>{source.authorizationStatus}</Badge>
                      </Td>
                      <Td>{source.lastSyncedAt ? new Date(source.lastSyncedAt).toLocaleString("zh-CN") : "-"}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            endpoint={`/api/data-sources/${source.id}/sync`}
                            label="同步"
                            pendingLabel="同步中"
                            icon="database"
                          />
                          <ActionButton
                            endpoint={`/api/data-sources/${source.id}`}
                            method="DELETE"
                            label="删授权"
                            pendingLabel="删除中"
                            icon="shieldX"
                            variant="danger"
                          />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>新增数据源</CardTitle>
            </CardHeader>
            <CardContent>
              <DataSourceCreateForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>授权账号</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {authorizationOverview.accounts.map((account) => (
                  <div key={account.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{account.displayName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          @{account.handle} · {platformLabels[account.platform]}
                        </div>
                      </div>
                      <Badge tone={statusTone[account.status]}>{account.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(account.authorization?.scopes ?? []).map((scope) => (
                        <Badge key={scope}>{scope}</Badge>
                      ))}
                    </div>
                    <div className="mt-3 text-xs leading-5 text-muted-foreground">
                      {account.authorization?.lastSyncedAt
                        ? `最近同步：${new Date(account.authorization.lastSyncedAt).toLocaleString("zh-CN")}`
                        : "等待首次同步"}
                    </div>
                    {account.authorization?.hasTokenRef ? (
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">授权凭据已托管在后端引用中。</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>合规边界</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>所有平台数据源都必须记录 sourceType、platform、authorizationStatus 和 lastSyncedAt。</p>
              <p>删除授权数据只删除可撤销授权和缓存数据，审计日志保留最小必要记录。</p>
              <p>抖音、小红书、B 站、公众号、微博、快手的真实接入只通过官方 API 或用户授权完成。</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
