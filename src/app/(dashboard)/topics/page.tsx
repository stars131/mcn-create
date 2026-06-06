import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { RiskBadge, TopicStatusBadge } from "@/components/ui/status-badge";
import { Table, Td, Th } from "@/components/ui/table";
import { platformLabels } from "@/lib/constants/navigation";
import { defaultWorkspace, store } from "@/server/services/mock-store";
import { listTopics } from "@/server/services/topic-service";

export default function TopicsPage() {
  const workspaceId = defaultWorkspace.id;
  const topics = listTopics(workspaceId);

  return (
    <>
      <PageHeading
        eyebrow="Topic Pool"
        title="选题池"
        description="承接热点 Agent 与数据分析 Agent 的输出，支持评分、状态流转、生成 brief 和加入内容日历。"
      />
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
                const hot = store.hotItems.find((item) => item.id === topic.hotItemId);
                const persona = store.personas.find((item) => item.id === topic.personaId);
                return (
                  <tr key={topic.id}>
                    <Td className="min-w-[280px]">
                      <div className="font-medium">{topic.title}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{topic.angle}</div>
                    </Td>
                    <Td>
                      <TopicStatusBadge status={topic.status} />
                    </Td>
                    <Td className="font-semibold">{topic.score}</Td>
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
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          endpoint={`/api/topics/${topic.id}/generate-brief`}
                          label="生成 brief"
                          pendingLabel="生成中"
                          icon="fileText"
                          variant="primary"
                        />
                        <ActionButton
                          endpoint={`/api/topics/${topic.id}/add-to-calendar`}
                          label="加日历"
                          pendingLabel="排期中"
                          icon="calendarPlus"
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
