import { History } from "lucide-react";
import { PersonaImportForm } from "@/components/persona/persona-import-form";
import { PersonaVersionActions } from "@/components/persona/persona-version-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { Table, Td, Th } from "@/components/ui/table";
import { platformLabels } from "@/lib/constants/navigation";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import { getPersonaMemoryDetail, listPersonas } from "@/server/services/persona-service";

export default function PersonaPage() {
  const workspaceId = getCurrentWorkspaceId();
  const persona = listPersonas(workspaceId)[0];
  const detail = persona ? getPersonaMemoryDetail(workspaceId, persona.id) : null;
  const versions = detail?.versions ?? [];
  const brandProfile = detail?.brandProfile;
  const brandMetadata = Object.entries(brandProfile?.metadata ?? {}).filter(([, value]) => value !== undefined);
  const formatBrandMetadata = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.join(" / ");
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <>
      <PageHeading
        eyebrow="Persona Memory"
        title="人设记忆层"
        description="人设不是聊天框，而是沉入系统底层的品牌记忆：可审阅、可编辑、可版本化，并参与选题和内容生成。"
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
                <div className="mt-1 text-lg font-semibold">{brandProfile?.name ?? persona.brandName}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {brandProfile ? <Badge tone="success">已绑定档案</Badge> : <Badge tone="warning">未绑定档案</Badge>}
                  {persona.brandProfileId ? <Badge>{persona.brandProfileId}</Badge> : null}
                </div>
              </div>
              {brandProfile ? (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground">行业</div>
                    <div className="mt-1 text-sm font-medium">{brandProfile.industry}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">定位</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{brandProfile.positioning}</p>
                  </div>
                  {brandProfile.promise ? (
                    <div>
                      <div className="text-xs text-muted-foreground">品牌承诺</div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{brandProfile.promise}</p>
                    </div>
                  ) : null}
                </>
              ) : null}
              {brandMetadata.length > 0 ? (
                <div>
                  <div className="text-xs text-muted-foreground">档案元数据</div>
                  <div className="mt-2 space-y-2">
                    {brandMetadata.slice(0, 4).map(([key, value]) => (
                      <div key={key} className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{key}</span>
                        <span className="ml-2">{formatBrandMetadata(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="border-t border-border pt-4">
                <div className="text-xs text-muted-foreground">人设</div>
                <div className="mt-1 font-medium">{persona.name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">目标受众</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(detail?.targetAudiences ?? []).map((audience) => (
                    <Badge key={audience.id} tone="info">
                      {audience.name}
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
                    {(detail?.forbiddenExpressions ?? []).map((item) => (
                      <Badge key={item.id} tone="danger">
                        {item.expression}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-semibold">风格样例</h3>
                <div className="mt-2 space-y-2">
                  {(detail?.toneExamples ?? []).map((example) => (
                    <div key={example.id} className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">{example.title}</div>
                      <div className="mt-1">{example.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>历史内容导入</CardTitle>
            </CardHeader>
            <CardContent>
              <PersonaImportForm personaId={persona.id} />
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>记忆片段与规则</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <thead>
                  <tr>
                    <Th>类型</Th>
                    <Th>内容</Th>
                    <Th>来源 / 严重度</Th>
                  </tr>
                </thead>
                <tbody>
                  {(detail?.memoryChunks ?? []).slice(0, 4).map((chunk) => (
                    <tr key={chunk.id}>
                      <Td>
                        <Badge tone="info">Memory</Badge>
                      </Td>
                      <Td className="max-w-[620px] text-sm text-muted-foreground">{chunk.content}</Td>
                      <Td>{chunk.sourceType}</Td>
                    </tr>
                  ))}
                  {(detail?.rules ?? []).slice(0, 6).map((rule) => (
                    <tr key={rule.id}>
                      <Td>
                        <Badge>{rule.type}</Badge>
                      </Td>
                      <Td className="max-w-[620px] text-sm text-muted-foreground">{rule.rule}</Td>
                      <Td>
                        <Badge tone={rule.severity === "high" ? "danger" : rule.severity === "medium" ? "warning" : "neutral"}>
                          {rule.severity}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>禁用表达与受众画像</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                {(detail?.forbiddenExpressions ?? []).map((item) => (
                  <div key={item.id} className="rounded-md border border-red-100 bg-red-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="danger">{item.expression}</Badge>
                      {item.replacement ? <Badge>{item.replacement}</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-red-800">{item.reason}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {(detail?.targetAudiences ?? []).map((audience) => (
                  <div key={audience.id} className="rounded-md border border-border p-3">
                    <div className="font-medium">{audience.name}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {audience.channels.map((channel) => (
                        <Badge key={channel} tone="info">
                          {platformLabels[channel]}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">痛点：{audience.painPoints.join(" / ")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">目标：{audience.goals.join(" / ")}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>人设版本管理</CardTitle>
              <PersonaVersionActions personaId={persona.id} reviewStatus={persona.reviewStatus} />
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
