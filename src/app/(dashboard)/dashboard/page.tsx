import { AlertTriangle, Bot, CalendarDays, FileCheck2, Flame, Layers3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeading } from "@/components/ui/page-heading";
import { AgentStatusBadge, ContentStatusBadge, RiskBadge, TopicStatusBadge } from "@/components/ui/status-badge";
import { Table, Td, Th } from "@/components/ui/table";
import { listAgentRuns } from "@/server/services/agent-run-service";
import { getAnalyticsOverview } from "@/server/services/analytics-service";
import { listContents } from "@/server/services/content-service";
import { listHotspots } from "@/server/services/hotspot-service";
import { defaultWorkspace, store } from "@/server/services/mock-store";
import { listTopics } from "@/server/services/topic-service";
import { platformLabels } from "@/lib/constants/navigation";

export default function DashboardPage() {
  const workspaceId = defaultWorkspace.id;
  const hotspots = listHotspots({ workspaceId });
  const topics = listTopics(workspaceId);
  const contents = listContents(workspaceId);
  const runs = listAgentRuns(workspaceId);
  const analytics = getAnalyticsOverview(workspaceId);
  const weekPlans = store.calendarItems.filter((item) => item.workspaceId === workspaceId);
  const pendingTopics = topics.filter((topic) => topic.status === "PENDING").length;
  const reviewContents = contents.filter((content) => content.status === "IN_REVIEW").length;

  return (
    <>
      <PageHeading
        eyebrow="Workspace Dashboard"
        title="内容运营驾驶舱"
        description="围绕热点洞察、选题池、人设记忆、内容生产、日历排期和数据复盘形成闭环。"
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="今日热点数量" value={hotspots.length} delta="mock 合规数据源" icon={Flame} />
        <MetricCard label="待处理选题" value={pendingTopics} delta="可从热点继续生成" icon={Layers3} />
        <MetricCard label="待审核内容" value={reviewContents} delta="风险检查入口已开启" icon={FileCheck2} />
        <MetricCard label="本周发布计划" value={weekPlans.length} delta="按平台排期" icon={CalendarDays} />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>热点与选题队列</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>热点</Th>
                  <Th>平台</Th>
                  <Th>热度</Th>
                  <Th>风险</Th>
                </tr>
              </thead>
              <tbody>
                {hotspots.slice(0, 5).map((hotspot) => (
                  <tr key={hotspot.id}>
                    <Td>
                      <div className="font-medium">{hotspot.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{hotspot.suggestedAngles[0]}</div>
                    </Td>
                    <Td>{platformLabels[hotspot.platform]}</Td>
                    <Td>{hotspot.heatScore}</Td>
                    <Td>
                      <RiskBadge level={hotspot.riskLevel} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据异常提醒</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.reports[0]?.anomalies.map((item) => (
              <div key={item} className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>待推进选题</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>选题</Th>
                  <Th>状态</Th>
                  <Th>评分</Th>
                </tr>
              </thead>
              <tbody>
                {topics.slice(0, 5).map((topic) => (
                  <tr key={topic.id}>
                    <Td>{topic.title}</Td>
                    <Td>
                      <TopicStatusBadge status={topic.status} />
                    </Td>
                    <Td>{topic.score}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent 最近运行状态</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>类型</Th>
                  <Th>状态</Th>
                  <Th>耗时</Th>
                  <Th>成本</Th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 5).map((run) => (
                  <tr key={run.id}>
                    <Td className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
                        {run.agentType.toLowerCase()}
                      </span>
                    </Td>
                    <Td>
                      <AgentStatusBadge status={run.status} />
                    </Td>
                    <Td>{run.latencyMs}ms</Td>
                    <Td>{run.costEstimate.toFixed(2)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5">
        <Card>
          <CardHeader>
            <CardTitle>待审核内容</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>标题</Th>
                  <Th>平台</Th>
                  <Th>状态</Th>
                  <Th>风险</Th>
                </tr>
              </thead>
              <tbody>
                {contents.map((content) => (
                  <tr key={content.id}>
                    <Td>{content.title}</Td>
                    <Td>{platformLabels[content.platform]}</Td>
                    <Td>
                      <ContentStatusBadge status={content.status} />
                    </Td>
                    <Td>
                      <RiskBadge level={content.riskLevel} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
