import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { RiskBadge } from "@/components/ui/status-badge";
import { Table, Td, Th } from "@/components/ui/table";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { platformLabels } from "@/lib/constants/navigation";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import { getHotspotRuntimeOverview, listHotClusters, listHotspots } from "@/server/services/hotspot-service";

export default function HotspotsPage() {
  const workspaceId = getCurrentWorkspaceId();
  const hotspots = listHotspots({ workspaceId });
  const clusters = listHotClusters(workspaceId);
  const runtime = getHotspotRuntimeOverview(workspaceId);
  const mainHotspot = hotspots[0];

  return (
    <>
      <PageHeading
        eyebrow="Hotspot Center"
        title="热点中心"
        description="只接入 mock、用户上传、公开合规或官方授权数据源，热点结果可直接进入选题池。"
        actions={
          <ActionButton
            endpoint="/api/hotspots/refresh"
            body={{ platforms: ["ALL"], window: "24h" }}
            label="刷新热点"
            pendingLabel="刷新中"
            icon="refresh"
            variant="primary"
          />
        }
      />

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        {["全网", "内容运营", "24h", "合规来源"].map((item) => (
          <div key={item} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-panel">
            <div className="text-xs text-muted-foreground">筛选</div>
            <div className="mt-1 font-medium">{item}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>热点行情面板</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>热点卡片</Th>
                  <Th>平台</Th>
                  <Th>热度</Th>
                  <Th>增速</Th>
                  <Th>风险</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {hotspots.map((item) => (
                  <tr key={item.id}>
                    <Td>
                      <div className="font-medium">{item.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.riskTags.map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    </Td>
                    <Td>{platformLabels[item.platform]}</Td>
                    <Td className="font-semibold">{item.heatScore}</Td>
                    <Td>{item.growthScore}</Td>
                    <Td>
                      <RiskBadge level={item.riskLevel} />
                    </Td>
                    <Td>
                      <ActionButton
                        endpoint={`/api/hotspots/${item.id}/generate-topic`}
                        label="生成选题"
                        pendingLabel="生成中"
                        icon="sparkles"
                        variant="primary"
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>热度曲线</CardTitle>
            </CardHeader>
            <CardContent>
              {mainHotspot ? <TrendChart data={mainHotspot.trend} /> : null}
              <div className="mt-3 text-sm text-muted-foreground">
                当前展示：{mainHotspot?.title ?? "暂无热点"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>热点聚类</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{cluster.name}</h3>
                    <RiskBadge level={cluster.riskLevel} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{cluster.summary}</p>
                  <div className="mt-3 text-xs text-muted-foreground">趋势原因：{cluster.trendReason}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>早期信号</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>信号</Th>
                  <Th>类型</Th>
                  <Th>置信度</Th>
                  <Th>时间</Th>
                </tr>
              </thead>
              <tbody>
                {runtime.signals.slice(0, 5).map((signal) => (
                  <tr key={signal.id}>
                    <Td>
                      <div className="font-medium">{signal.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {signal.hotItemId ?? signal.clusterId ?? "全局信号"}
                      </div>
                    </Td>
                    <Td>{signal.signalType}</Td>
                    <Td>{Math.round(signal.confidence * 100)}%</Td>
                    <Td>{new Date(signal.detectedAt).toLocaleString("zh-CN")}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>趋势快照</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>对象</Th>
                  <Th>热度</Th>
                  <Th>增速</Th>
                  <Th>指标</Th>
                </tr>
              </thead>
              <tbody>
                {runtime.trendSnapshots.slice(0, 5).map((snapshot) => (
                  <tr key={snapshot.id}>
                    <Td>{snapshot.hotItemId ?? snapshot.clusterId ?? "全局快照"}</Td>
                    <Td className="font-semibold">{snapshot.heatScore}</Td>
                    <Td>{snapshot.growthScore}</Td>
                    <Td className="text-xs text-muted-foreground">{JSON.stringify(snapshot.metrics)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>竞品账号</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {runtime.competitorAccounts.map((account) => (
              <div key={account.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{account.displayName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      @{account.handle} · {platformLabels[account.platform]}
                    </div>
                  </div>
                  <Badge tone="info">{account.sourceType}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {account.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>关键词监控</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {runtime.keywordWatches.map((watch) => (
              <div key={watch.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{watch.keyword}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{watch.industry}</div>
                  </div>
                  <Badge tone={watch.enabled ? "success" : "neutral"}>{watch.enabled ? "启用" : "停用"}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {watch.platforms.map((platform) => (
                    <Badge key={platform}>{platformLabels[platform]}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
