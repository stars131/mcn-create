import { KeyRound, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { Table, Td, Th } from "@/components/ui/table";
import { listAuditLogs } from "@/server/audit/audit-service";
import { promptTemplates } from "@/server/ai/prompts/templates";
import { getCurrentUser, getCurrentWorkspaceId } from "@/server/auth/session";
import { store } from "@/server/services/mock-store";

export default function SettingsPage() {
  const user = getCurrentUser();
  const workspaceId = getCurrentWorkspaceId();
  const workspace = store.workspaces.find((item) => item.id === workspaceId);
  const logs = listAuditLogs(workspaceId);

  return (
    <>
      <PageHeading
        eyebrow="Settings"
        title="设置"
        description="集中管理 workspace、品牌、AI 模型、数据保留策略、审计日志、API Key 和 webhook 预留。"
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Workspace 设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">名称</span>
              <span className="font-medium">{workspace?.name ?? workspaceId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">组织</span>
              <span className="font-medium">{workspace?.organizationName ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">计划</span>
              <Badge tone="info">{workspace?.currentPlan ?? "MVP Team"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI 模型设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-medium">AI Provider：mock</span>
            </div>
            <p>真实模型接入通过 provider 抽象扩展，业务层只调用 generateText、generateStructuredObject、embedText、rerank、summarize、classifyRisk。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Key / Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-medium">结构已预留</span>
            </div>
            <p>Prisma schema 中已包含 ApiKey、WebhookEndpoint、UsageEvent 和 CreditLedger。</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card id="audit">
          <CardHeader>
            <CardTitle>审计日志</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>动作</Th>
                  <Th>对象</Th>
                  <Th>摘要</Th>
                  <Th>时间</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <Td className="font-medium">{log.action}</Td>
                    <Td>{log.entityType}</Td>
                    <Td>{log.summary}</Td>
                    <Td>{new Date(log.createdAt).toLocaleString("zh-CN")}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompt 模板版本</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {promptTemplates.map((template) => (
              <div key={template.name} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{template.name}</span>
                  <Badge>v{template.version}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{template.userPrompt}</p>
              </div>
            ))}
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              当前用户：{user.email}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
