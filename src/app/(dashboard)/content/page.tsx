import { ActionButton } from "@/components/ui/action-button";
import { ContentEditorForm } from "@/components/content/content-editor-form";
import { ContentGenerateForm } from "@/components/content/content-generate-form";
import { ContentScheduleForm } from "@/components/content/content-schedule-form";
import { ContentVersionCompare } from "@/components/content/content-version-compare";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { ContentStatusBadge, RiskBadge } from "@/components/ui/status-badge";
import { platformLabels } from "@/lib/constants/navigation";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import {
  listContentBlocks,
  listContentMediaAssets,
  listContentReviews,
  listContentRiskChecks,
  listContents,
  listContentVersions,
  listPlatformAdaptations,
  listPublishPlans,
  listWorkspaceContentTemplates
} from "@/server/services/content-service";
import { store } from "@/server/services/mock-store";
import { listPersonas } from "@/server/services/persona-service";
import { listTopics } from "@/server/services/topic-service";

export default function ContentPage() {
  const workspaceId = getCurrentWorkspaceId();
  const topics = listTopics(workspaceId);
  const personas = listPersonas(workspaceId);
  const contents = listContents(workspaceId);
  const activeTopic = topics[0];
  const activePersona = personas[0];
  const activeContent = contents[0];
  const activeVersions = activeContent ? listContentVersions(workspaceId, activeContent.id) : [];
  const activeBlocks = activeContent ? listContentBlocks(workspaceId, activeContent.id) : [];
  const activeMediaAssets = activeContent ? listContentMediaAssets(workspaceId, activeContent.id) : [];
  const activeRiskChecks = activeContent ? listContentRiskChecks(workspaceId, activeContent.id) : [];
  const activeReviews = activeContent ? listContentReviews(workspaceId, activeContent.id) : [];
  const activeAdaptations = activeContent ? listPlatformAdaptations(workspaceId, activeContent.id) : [];
  const activePublishPlans = activeContent ? listPublishPlans(workspaceId, activeContent.id) : [];
  const contentTemplates = listWorkspaceContentTemplates(workspaceId);
  const activeTemplate = activeContent
    ? contentTemplates.find(
        (template) => template.platform === activeContent.platform && template.format === activeContent.format
      ) ?? contentTemplates.find((template) => template.platform === activeContent.platform)
    : undefined;
  const latestRiskCheck = activeRiskChecks[0];
  const latestReview = activeReviews[0];
  const nextPublishPlan = activePublishPlans[0];
  const activeBrief = activeTopic
    ? store.topicBriefs.find((brief) => brief.workspaceId === workspaceId && brief.topicId === activeTopic.id)
    : undefined;

  return (
    <>
      <PageHeading
        eyebrow="Content Studio"
        title="内容工作台"
        description="左侧承接选题 brief 与人设，中间编辑草稿，右侧展示 AI 建议、风险提示和平台适配入口。"
      />

      <section className="grid min-h-[680px] gap-4 xl:grid-cols-[300px_1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>生成内容草稿</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ContentGenerateForm
              topics={topics.map((topic) => ({
                id: topic.id,
                title: topic.title,
                angle: topic.angle,
                targetPlatforms: topic.targetPlatforms
              }))}
              personas={personas.map((persona) => ({
                id: persona.id,
                name: persona.name
              }))}
              briefs={store.topicBriefs
                .filter((brief) => brief.workspaceId === workspaceId)
                .map((brief) => ({
                  topicId: brief.topicId,
                  summary: brief.summary
                }))}
              templates={contentTemplates.map((template) => ({
                id: template.id,
                platform: template.platform,
                format: template.format,
                name: template.name
              }))}
              defaultTopicId={activeTopic?.id}
              defaultPersonaId={activePersona?.id}
            />
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
            <div>
              <div className="text-xs text-muted-foreground">当前模板</div>
              <div className="mt-2 rounded-md bg-muted p-3 text-sm leading-6">
                <div className="font-medium">{activeTemplate?.name ?? "等待选择内容模板"}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeTemplate
                    ? `${platformLabels[activeTemplate.platform]} · ${activeTemplate.format} · v${activeTemplate.version}`
                    : "生成内容时会按平台匹配结构化模板。"}
                </p>
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
                <ContentEditorForm
                  contentDraftId={activeContent.id}
                  initialTitle={activeContent.title}
                  initialContent={activeContent.content}
                  initialStatus={activeContent.status}
                  initialVersion={activeContent.currentVersion}
                />
                {activeBlocks.length > 0 ? (
                  <div className="rounded-md border border-border bg-muted/50 p-3">
                    <div className="mb-3 text-xs font-semibold text-muted-foreground">结构化内容块</div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {activeBlocks.map((block) => (
                        <div key={block.id} className="rounded-md bg-white p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <Badge tone="neutral">{String(block.metadata?.label ?? block.type)}</Badge>
                            <span className="text-xs text-muted-foreground">#{block.sortOrder}</span>
                          </div>
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{block.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
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
                </div>
                <ContentScheduleForm contentDraftId={activeContent.id} initialPlatform={activeContent.platform} />
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
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap gap-2">
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
                  {activeAdaptations.length > 0 ? (
                    <div className="space-y-2">
                      {activeAdaptations.slice(0, 2).map((adaptation) => (
                        <div key={adaptation.id} className="rounded-md bg-muted px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <Badge tone="info">{platformLabels[adaptation.platform]}</Badge>
                            <span className="text-xs text-muted-foreground">适配记录</span>
                          </div>
                          <div className="mt-2 text-xs leading-5 text-muted-foreground">{adaptation.title}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>模板与素材</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs text-muted-foreground">可用模板</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {contentTemplates.slice(0, 5).map((template) => (
                    <Badge key={template.id} tone={template.id === activeTemplate?.id ? "info" : "neutral"}>
                      {template.format}
                    </Badge>
                  ))}
                </div>
              </div>
              {activeMediaAssets.length > 0 ? (
                activeMediaAssets.slice(0, 2).map((asset) => (
                  <div key={asset.id} className="rounded-md bg-muted p-3">
                    <div className="font-medium leading-5">{asset.name}</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {asset.assetType} · {asset.sourceType}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">生成内容后会沉淀封面提示和素材记录。</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>风险提示</CardTitle>
            </CardHeader>
            <CardContent>
              {activeContent ? (
                <>
                  <RiskBadge level={latestRiskCheck?.riskLevel ?? activeContent.riskLevel} />
                  <div className="mt-3 space-y-2">
                    {(latestRiskCheck?.riskItems ?? activeContent.riskItems).map((item) => (
                      <div key={item} className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                        {item}
                      </div>
                    ))}
                  </div>
                  {latestRiskCheck?.rewriteSuggestions.length ? (
                    <div className="mt-3 rounded-md border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                      {latestRiskCheck.rewriteSuggestions[0]}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">生成内容后会展示风险检查结果。</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>审核与发布</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {activeContent ? (
                <>
                  <div className="rounded-md bg-muted p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">最近审核</span>
                      <ContentStatusBadge status={latestReview?.status ?? activeContent.status} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {latestReview?.comment ?? "尚无人工审核记录。"}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">下一次排期</span>
                      {nextPublishPlan ? <Badge tone="info">{platformLabels[nextPublishPlan.platform]}</Badge> : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {nextPublishPlan
                        ? new Date(nextPublishPlan.scheduledAt).toLocaleString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "尚未创建发布计划。"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">生成内容后可进行审核和排期。</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>版本记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeVersions.length > 0 ? (
                <>
                  <ContentVersionCompare versions={activeVersions} />
                  {activeVersions.slice(0, 3).map((version) => (
                    <div key={version.id} className="rounded-md bg-muted p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="neutral">v{version.version}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(version.createdAt).toLocaleDateString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <div className="mt-2 font-medium leading-5">{version.changeNote ?? "版本快照"}</div>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                        {version.content}
                      </p>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">暂无版本记录。</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
