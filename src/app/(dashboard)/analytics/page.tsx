import { BarChart3 } from "lucide-react";
import { MetricChart } from "@/components/analytics/metric-chart";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeading } from "@/components/ui/page-heading";
import { Table, Td, Th } from "@/components/ui/table";
import { platformLabels } from "@/lib/constants/navigation";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import { getAnalyticsOverview, listPostMetrics } from "@/server/services/analytics-service";

const recommendationStatusLabels = {
  OPEN: "待处理",
  CONVERTED: "已回流",
  DISMISSED: "已关闭"
};

const recommendationStatusTones = {
  OPEN: "warning",
  CONVERTED: "success",
  DISMISSED: "neutral"
} as const;

const experimentStatusLabels = {
  PLANNED: "待验证",
  RUNNING: "运行中",
  COMPLETED: "已完成",
  PAUSED: "已暂停"
};

const sentimentLabels = {
  POSITIVE: "正向",
  NEUTRAL: "中性",
  NEGATIVE: "负向",
  MIXED: "混合"
};

const moduleLabels = {
  TOPIC: "选题",
  PERSONA: "人设",
  CONTENT: "内容",
  CALENDAR: "日历"
};

function shortDate(value: string) {
  return value.slice(0, 10);
}

export default function AnalyticsPage() {
  const workspaceId = getCurrentWorkspaceId();
  const overview = getAnalyticsOverview(workspaceId);
  const posts = listPostMetrics(workspaceId);
  const report = overview.reports[0];
  const openRecommendations = overview.recommendations.filter((item) => item.status === "OPEN").length;
  const publishedPostById = new Map(overview.publishedPosts.map((post) => [post.id, post]));

  return (
    <>
      <PageHeading
        eyebrow="Lightweight BI"
        title="数据分析"
        description="支持 CSV / JSON / Excel 表格导入的轻量复盘，生成周报、异常解释、A/B 假设，并将建议回流选题池。"
        actions={
          <>
            <ActionButton
              endpoint="/api/analytics/import"
              body={{
                fileType: "CSV",
                fileName: "content-performance-sample.csv",
                rawText:
                  "作品,平台,曝光,点赞,评论,分享,转化,发布时间\n导入样例：人设记忆清单,公众号,16800,820,91,134,42,2026-06-07"
              }}
              label="导入 CSV 样例"
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
        <MetricCard label="已发布作品" value={overview.publishedPosts.length} delta="发布计划回写" icon={BarChart3} />
        <MetricCard label="待处理建议" value={openRecommendations} delta="可回流选题与人设" icon={BarChart3} />
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

      <section className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>导入文件历史</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>文件</Th>
                  <Th>类型</Th>
                  <Th>行数</Th>
                  <Th>状态</Th>
                </tr>
              </thead>
              <tbody>
                {overview.importedFiles.slice(0, 5).map((file) => (
                  <tr key={file.id}>
                    <Td>
                      <div className="font-medium">{file.fileName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{shortDate(file.createdAt)}</div>
                    </Td>
                    <Td>{file.fileType}</Td>
                    <Td>{file.rowCount}</Td>
                    <Td>
                      <Badge tone={file.status === "PARSED" ? "success" : "danger"}>{file.status === "PARSED" ? "已解析" : "失败"}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>评论洞察</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.commentInsights.slice(0, 3).map((insight) => (
              <div key={insight.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={insight.sentiment === "NEGATIVE" ? "danger" : insight.sentiment === "POSITIVE" ? "success" : "info"}>
                    {sentimentLabels[insight.sentiment]}
                  </Badge>
                  {insight.keywords.map((keyword) => (
                    <Badge key={keyword}>{keyword}</Badge>
                  ))}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>A/B 假设与实验</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>假设</Th>
                  <Th>变量</Th>
                  <Th>指标</Th>
                </tr>
              </thead>
              <tbody>
                {overview.abHypotheses.slice(0, 5).map((hypothesis) => (
                  <tr key={hypothesis.id}>
                    <Td>
                      <div className="font-medium">{hypothesis.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{hypothesis.rationale}</div>
                    </Td>
                    <Td>
                      <div className="text-xs text-muted-foreground">A：{hypothesis.variantA}</div>
                      <div className="mt-1 text-xs text-muted-foreground">B：{hypothesis.variantB}</div>
                    </Td>
                    <Td>{hypothesis.successMetric}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-3 flex flex-wrap gap-2">
              {overview.experiments.slice(0, 4).map((experiment) => (
                <Badge key={experiment.id} tone={experiment.status === "COMPLETED" ? "success" : experiment.status === "RUNNING" ? "info" : "warning"}>
                  {experiment.name} · {experimentStatusLabels[experiment.status]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>建议回流状态</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>建议</Th>
                  <Th>目标</Th>
                  <Th>状态</Th>
                </tr>
              </thead>
              <tbody>
                {overview.recommendations.slice(0, 6).map((recommendation) => (
                  <tr key={recommendation.id}>
                    <Td>
                      <div className="font-medium">{recommendation.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{recommendation.rationale}</div>
                    </Td>
                    <Td>{moduleLabels[recommendation.targetModule]}</Td>
                    <Td>
                      <Badge tone={recommendationStatusTones[recommendation.status]}>
                        {recommendationStatusLabels[recommendation.status]}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>发布作品日指标</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>作品</Th>
                  <Th>平台</Th>
                  <Th>日期</Th>
                  <Th>曝光</Th>
                  <Th>互动</Th>
                  <Th>转化</Th>
                </tr>
              </thead>
              <tbody>
                {overview.postDailyMetrics.slice(0, 6).map((metric) => {
                  const publishedPost = metric.publishedPostId ? publishedPostById.get(metric.publishedPostId) : undefined;

                  return (
                    <tr key={metric.id}>
                      <Td>
                        <div className="font-medium">{publishedPost?.platformPostId ?? metric.publishedPostId ?? "手动导入作品"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{publishedPost?.url ?? "等待平台链接"}</div>
                      </Td>
                      <Td>
                        <Badge tone="info">{platformLabels[metric.platform]}</Badge>
                      </Td>
                      <Td>{shortDate(metric.metricDate)}</Td>
                      <Td>{metric.views.toLocaleString()}</Td>
                      <Td>{(metric.likes + metric.comments + metric.shares).toLocaleString()}</Td>
                      <Td>{metric.conversions}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>账号日指标</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>平台</Th>
                  <Th>粉丝</Th>
                  <Th>曝光</Th>
                  <Th>互动率</Th>
                </tr>
              </thead>
              <tbody>
                {overview.accountDailyMetrics.slice(0, 6).map((metric) => (
                  <tr key={metric.id}>
                    <Td>
                      <Badge tone="info">{platformLabels[metric.platform]}</Badge>
                    </Td>
                    <Td>{metric.followers.toLocaleString()}</Td>
                    <Td>{metric.impressions.toLocaleString()}</Td>
                    <Td>{metric.engagementRate}%</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
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
