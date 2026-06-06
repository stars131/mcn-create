import { History } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import { listPersonaVersions, listPersonas } from "@/server/services/persona-service";

export default function PersonaPage() {
  const workspaceId = getCurrentWorkspaceId();
  const persona = listPersonas(workspaceId)[0];
  const versions = persona ? listPersonaVersions(workspaceId, persona.id) : [];

  return (
    <>
      <PageHeading
        eyebrow="Persona Memory"
        title="人设记忆层"
        description="人设不是聊天框，而是沉入系统底层的品牌记忆：可审阅、可编辑、可版本化，并参与选题和内容生成。"
        actions={
          persona ? (
            <ActionButton
              endpoint={`/api/personas/${persona.id}/import-content`}
              body={{
                importedContent: "历史内容强调工作流、合规来源、人工审核和数据复盘。",
                brandNotes: "默认禁止全自动代运营、一键爆款等表达。"
              }}
              label="导入历史内容"
              pendingLabel="提取中"
              icon="upload"
              variant="primary"
            />
          ) : null
        }
      />

      {persona ? (
        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>品牌档案</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">品牌</div>
                <div className="mt-1 text-lg font-semibold">{persona.brandName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">人设</div>
                <div className="mt-1 font-medium">{persona.name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">目标受众</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {persona.targetAudiences.map((audience) => (
                    <Badge key={audience} tone="info">
                      {audience}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">审阅状态</div>
                <div className="mt-2">
                  <Badge tone={persona.reviewStatus === "APPROVED" ? "success" : "warning"}>{persona.reviewStatus}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>语气说明书</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{persona.voiceGuide}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">高频表达</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {persona.highFrequencyWords.map((word) => (
                      <Badge key={word}>{word}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">禁用表达</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {persona.forbiddenExpressions.map((word) => (
                      <Badge key={word} tone="danger">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-semibold">风格样例</h3>
                <div className="mt-2 space-y-2">
                  {persona.toneExamples.map((example) => (
                    <div key={example} className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>人设版本管理</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {versions.map((version) => (
                <div key={version.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">v{version.version}</span>
                    <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{version.summary}</p>
                  <div className="mt-3">
                    <Badge tone={version.status === "APPROVED" ? "success" : "warning"}>{version.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </>
  );
}
