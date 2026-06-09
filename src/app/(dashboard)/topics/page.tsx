import { TopicCreateForm } from "@/components/topics/topic-create-form";
import { TopicUpdateForm } from "@/components/topics/topic-update-form";
import { TopicWorkflowActions } from "@/components/topics/topic-workflow-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { RiskBadge, TopicStatusBadge } from "@/components/ui/status-badge";
import { Table, Td, Th } from "@/components/ui/table";
import { platformLabels } from "@/lib/constants/navigation";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import { store } from "@/server/services/mock-store";
import { listTopicAngles, listTopicScores, listTopicStatusHistory, listTopics } from "@/server/services/topic-service";

export default function TopicsPage() {
  const workspaceId = getCurrentWorkspaceId();
  const topics = listTopics(workspaceId);
  const topicIds = new Set(topics.map((topic) => topic.id));
  const topicAngles = listTopicAngles(workspaceId).filter((angle) => topicIds.has(angle.topicId));
  const topicScores = listTopicScores(workspaceId).filter((score) => topicIds.has(score.topicId));
  const statusHistory = listTopicStatusHistory(workspaceId).filter((history) => topicIds.has(history.topicId));
  const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
  const latestAngleByTopic = new Map<string, (typeof topicAngles)[number]>();
  const latestScoreByTopic = new Map<string, (typeof topicScores)[number]>();

  topicAngles.forEach((angle) => {
    if (!latestAngleByTopic.has(angle.topicId)) {
      latestAngleByTopic.set(angle.topicId, angle);
    }
  });
  topicScores.forEach((score) => {
    if (!latestScoreByTopic.has(score.topicId)) {
      latestScoreByTopic.set(score.topicId, score);
    }
  });

  return (
    <>
      <PageHeading
        eyebrow="Topic Pool"
        title="选题池"
        description="承接热点 Agent 与数据分析 Agent 的输出，支持评分、状态流转、生成 brief 和加入内容日历。"
      />
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>手动新建选题</CardTitle>
        </CardHeader>
        <CardContent>
          <TopicCreateForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>选题列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>选题</Th>
                <Th>状态</Th>
                <Th>评分</Th>
                <Th>平台</Th>
                <Th>关联</Th>
                <Th>风险</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => {
                const hot = store.hotItems.find(
                  (item) => item.workspaceId === workspaceId && item.id === topic.hotItemId
                );
                const persona = store.personas.find(
                  (item) => item.workspaceId === workspaceId && item.id === topic.personaId
                );
                const angle = latestAngleByTopic.get(topic.id);
                const score = latestScoreByTopic.get(topic.id);
                return (
                  <tr key={topic.id}>
                    <Td className="min-w-[280px]">
                      <div className="font-medium">{topic.title}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{topic.angle}</div>
                      {angle ? (
                        <div className="mt-2 text-xs leading-5 text-muted-foreground">钩子：{angle.hook}</div>
                      ) : null}
                    </Td>
                    <Td>
                      <TopicStatusBadge status={topic.status} />
                    </Td>
                    <Td className="font-semibold">
                      <div>{topic.score}</div>
                      {score ? (
                        <div className="mt-1 whitespace-nowrap text-[11px] font-normal text-muted-foreground">
                          相关 {score.relevance} / 商业 {score.businessValue}
                        </div>
                      ) : null}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {topic.targetPlatforms.map((platform) => (
                          <Badge key={platform}>{platformLabels[platform]}</Badge>
                        ))}
                      </div>
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      <div>{hot?.title ?? "数据复盘回流"}</div>
                      <div className="mt-1">{persona?.name ?? "默认人设"}</div>
                    </Td>
                    <Td>
                      <RiskBadge level={topic.riskLevel} />
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-3">
                        <TopicWorkflowActions
                          topicId={topic.id}
                          topicTitle={topic.title}
                          targetPlatforms={topic.targetPlatforms}
                        />
                        <TopicUpdateForm
                          topicId={topic.id}
                          topicTitle={topic.title}
                          initialStatus={topic.status}
                          initialScore={topic.score}
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

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>切入角度资产</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topicAngles.slice(0, 4).map((angle) => (
                <div key={angle.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="text-sm font-medium">{angle.title}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{angle.hook}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {angle.outline.map((item) => (
                      <Badge key={item}>{item}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>评分拆解</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topicScores.slice(0, 4).map((score) => {
                const topic = topicsById.get(score.topicId);

                return (
                  <div key={score.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="text-sm font-medium">{topic?.title ?? score.topicId}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>相关度：{score.relevance}</div>
                      <div>竞争度：{score.competition}</div>
                      <div>商业价值：{score.businessValue}</div>
                      <div>执行难度：{score.executionDifficulty}</div>
                    </div>
                    <div className="mt-2 text-xs leading-5 text-muted-foreground">{score.rationale}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>状态流转</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusHistory
                .slice(-6)
                .reverse()
                .map((history) => {
                  const topic = topicsById.get(history.topicId);

                  return (
                    <div key={history.id} className="border-l-2 border-primary/40 pl-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <span>{history.fromStatus ?? "NEW"}</span>
                        <span className="text-muted-foreground">→</span>
                        <TopicStatusBadge status={history.toStatus} />
                      </div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        {topic?.title ?? history.topicId}
                      </div>
                      {history.reason ? (
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">{history.reason}</div>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        {store.topicBriefs
          .filter((brief) => brief.workspaceId === workspaceId)
          .slice(0, 3)
          .map((brief) => (
            <Card key={brief.id}>
              <CardHeader>
                <CardTitle>内容 brief v{brief.version}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{brief.summary}</p>
                <div className="mt-3 space-y-1 text-sm">
                  {brief.outline.map((item) => (
                    <div key={item}>- {item}</div>
                  ))}
                </div>
                <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">CTA：{brief.cta}</div>
              </CardContent>
            </Card>
          ))}
      </section>
    </>
  );
}
