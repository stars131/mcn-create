import { BarChart3 } from "lucide-react";
import { MetricChart } from "@/components/analytics/metric-chart";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeading } from "@/components/ui/page-heading";
import { Table, Td, Th } from "@/components/ui/table";
import { platformLabels } from "@/lib/constants/navigation";
import { getAnalyticsOverview, listPostMetrics } from "@/server/services/analytics-service";
import { defaultWorkspace } from "@/server/services/mock-store";

export default function AnalyticsPage() {
  const workspaceId = defaultWorkspace.id;
  const overview = getAnalyticsOverview(workspaceId);
  const posts = listPostMetrics(workspaceId);
  const report = overview.reports[0];

  return (
    <>
      <PageHeading
        eyebrow="Lightweight BI"
        title="数据分析"
        description="支持 CSV / JSON 导入的轻量复盘，生成周报、异常解释、A/B 假设，并将建议回流选题池。"
        actions={
          <>
            <ActionButton
              endpoint="/api/analytics/import"
              body={{
                records: [
                  {
                    title: "导入样例：人设记忆清单",
                    platform: "WECHAT",
                    views: 16800,
                    likes: 820,
                    comments: 91,
                    shares: 134,
                    conversions: 42
                  }
                ]
              }}
              label="导入 mock 数据"
              pendingLabel="导入中"
              icon="fileUp"
            />
            <ActionButton
              endpoint="/api/analytics/reports/generate"
              body={{ period: "本周" }}
              label="生成周报"
              pendingLabel="生成中"
              icon="refresh"
              variant="primary"
            />
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="总曝光" value={overview.totals.views.toLocaleString()} delta="导入与 mock 指标" icon={BarChart3} />
        <MetricCard label="互动数" value={(overview.totals.likes + overview.totals.comments + overview.totals.shares).toLocaleString()} icon={BarChart3} />
        <MetricCard label="评论数" value={overview.totals.comments.toLocaleString()} icon={BarChart3} />
        <MetricCard label="转化目标" value={overview.totals.conversions.toLocaleString()} icon={BarChart3} />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>指标趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricChart data={overview.trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最新周报</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report ? (
              <>
                <div>
                  <h3 className="text-sm font-semibold">{report.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.summary}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">异常波动</div>
                  <div className="mt-2 space-y-2">
                    {report.anomalies.map((item) => (
                      <div key={item} className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <ActionButton
                  endpoint="/api/analytics/recommendations/to-topics"
                  label="建议回流选题池"
                  pendingLabel="回流中"
                  icon="sendToBack"
                  variant="primary"
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">生成周报后展示复盘结果。</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>作品表现</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>作品</Th>
                <Th>平台</Th>
                <Th>曝光</Th>
                <Th>互动</Th>
                <Th>转化</Th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <Td>{post.title}</Td>
                  <Td>
                    <Badge tone="info">{platformLabels[post.platform]}</Badge>
                  </Td>
                  <Td>{post.views.toLocaleString()}</Td>
                  <Td>{(post.likes + post.comments + post.shares).toLocaleString()}</Td>
                  <Td>{post.conversions}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
