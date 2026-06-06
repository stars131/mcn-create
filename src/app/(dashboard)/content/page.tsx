import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { ContentStatusBadge, RiskBadge } from "@/components/ui/status-badge";
import { platformLabels } from "@/lib/constants/navigation";
import { listContents } from "@/server/services/content-service";
import { defaultWorkspace, store } from "@/server/services/mock-store";
import { listPersonas } from "@/server/services/persona-service";
import { listTopics } from "@/server/services/topic-service";

export default function ContentPage() {
  const workspaceId = defaultWorkspace.id;
  const topics = listTopics(workspaceId);
  const personas = listPersonas(workspaceId);
  const contents = listContents(workspaceId);
  const activeTopic = topics[0];
  const activePersona = personas[0];
  const activeContent = contents[0];
  const activeBrief = activeTopic
    ? store.topicBriefs.find((brief) => brief.workspaceId === workspaceId && brief.topicId === activeTopic.id)
    : undefined;

  return (
    <>
      <PageHeading
        eyebrow="Content Studio"
        title="内容工作台"
        description="左侧承接选题 brief 与人设，中间编辑草稿，右侧展示 AI 建议、风险提示和平台适配入口。"
        actions={
          activeTopic ? (
            <ActionButton
              endpoint="/api/contents/generate"
              body={{
                topicId: activeTopic.id,
                personaId: activePersona?.id,
                platform: "XIAOHONGSHU",
                format: "图文",
                cta: "领取内容工作流检查表"
              }}
              label="生成内容草稿"
              pendingLabel="生成中"
              icon="wand"
              variant="primary"
            />
          ) : null
        }
      />

      <section className="grid min-h-[680px] gap-4 xl:grid-cols-[300px_1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>选题 brief / 人设 / 目标</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">选题</div>
              <div className="mt-1 text-sm font-semibold leading-6">{activeTopic?.title ?? "暂无选题"}</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{activeTopic?.angle}</p>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">内容 brief</div>
              <div className="mt-2 rounded-md bg-muted p-3 text-sm leading-6 text-muted-foreground">
                {activeBrief?.summary ?? "可先在选题池生成 brief。"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">人设</div>
              <div className="mt-1 text-sm font-medium">{activePersona?.name}</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{activePersona?.voiceGuide}</p>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">平台与目标</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["小红书图文", "抖音口播稿", "B 站视频脚本", "公众号文章", "视频号短内容"].map((item) => (
                  <Badge key={item} tone="info">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>内容编辑器</CardTitle>
            {activeContent ? <ContentStatusBadge status={activeContent.status} /> : null}
          </CardHeader>
          <CardContent>
            {activeContent ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{platformLabels[activeContent.platform]}</Badge>
                  <Badge>{activeContent.format}</Badge>
                  <Badge tone="neutral">v{activeContent.currentVersion}</Badge>
                </div>
                <h2 className="text-xl font-semibold tracking-normal">{activeContent.title}</h2>
                <div className="min-h-[420px] whitespace-pre-wrap rounded-md border border-border bg-white p-4 text-sm leading-7">
                  {activeContent.content}
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    endpoint={`/api/contents/${activeContent.id}/risk-check`}
                    label="风险检查"
                    pendingLabel="检查中"
                    icon="shieldAlert"
                    variant="primary"
                  />
                  <ActionButton
                    endpoint={`/api/contents/${activeContent.id}/review`}
                    body={{ status: "APPROVED", comment: "MVP 人工审核通过" }}
                    label="审核通过"
                    pendingLabel="提交中"
                    icon="checkCircle"
                  />
                  <ActionButton
                    endpoint={`/api/contents/${activeContent.id}/schedule`}
                    body={{ platform: activeContent.platform }}
                    label="加入日历"
                    pendingLabel="排期中"
                    icon="filePlus"
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                选择选题后生成内容草稿
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI 建议</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>当前草稿应继续保持人设一致性，避免绝对化增长承诺。</p>
              <p>建议先生成抖音口播版，再扩写公众号长文版，复用同一 brief。</p>
              {activeContent ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <ActionButton
                    endpoint={`/api/contents/${activeContent.id}/adapt`}
                    body={{ platform: "DOUYIN" }}
                    label="抖音版"
                    pendingLabel="改写中"
                    icon="copyPlus"
                  />
                  <ActionButton
                    endpoint={`/api/contents/${activeContent.id}/adapt`}
                    body={{ platform: "WECHAT" }}
                    label="公众号版"
                    pendingLabel="改写中"
                    icon="copyPlus"
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>风险提示</CardTitle>
            </CardHeader>
            <CardContent>
              {activeContent ? (
                <>
                  <RiskBadge level={activeContent.riskLevel} />
                  <div className="mt-3 space-y-2">
                    {activeContent.riskItems.map((item) => (
                      <div key={item} className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                        {item}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">生成内容后会展示风险检查结果。</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>版本对比预留</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              当前保留 ContentVersion 数据结构和版本号，后续可接入逐段 diff 与评论审阅。
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
