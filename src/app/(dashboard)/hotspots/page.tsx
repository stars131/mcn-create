import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { RiskBadge } from "@/components/ui/status-badge";
import { Table, Td, Th } from "@/components/ui/table";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { platformLabels } from "@/lib/constants/navigation";
import { listHotClusters, listHotspots } from "@/server/services/hotspot-service";
import { defaultWorkspace } from "@/server/services/mock-store";

export default function HotspotsPage() {
  const workspaceId = defaultWorkspace.id;
  const hotspots = listHotspots({ workspaceId });
  const clusters = listHotClusters(workspaceId);
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
    </>
  );
}
