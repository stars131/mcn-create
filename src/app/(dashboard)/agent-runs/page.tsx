import Link from "next/link";
import { AgentRunActions } from "@/components/agent-runs/agent-run-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { AgentStatusBadge } from "@/components/ui/status-badge";
import { Table, Td, Th } from "@/components/ui/table";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import { listAgentRunDetails } from "@/server/services/agent-run-service";

function summarize(value: unknown, maxLength = 110) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) {
    return "-";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatCost(value: number) {
  return `¥${value.toFixed(4)}`;
}

interface AgentRunsPageProps {
  searchParams?: {
    runId?: string;
  };
}

export default function AgentRunsPage({ searchParams }: AgentRunsPageProps) {
  const workspaceId = getCurrentWorkspaceId();
  const details = listAgentRunDetails(workspaceId);
  const latest = details[0];
  const selected = details.find((detail) => detail.run.id === searchParams?.runId) ?? latest;
  const selectedRunId = selected?.run.id;

  return (
    <>
      <PageHeading
        eyebrow="Agent Runs"
        title="Agent 运行中心"
        description="每次 Agent 调用都记录运行状态、Prompt 模板、步骤轨迹、结构化输出、反馈和审计信息。"
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>运行次数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{details.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">当前 workspace</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>步骤记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{details.reduce((sum, item) => sum + item.steps.length, 0)}</div>
            <div className="mt-1 text-xs text-muted-foreground">验证、调用、持久化</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>输出记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{details.reduce((sum, item) => sum + item.outputs.length, 0)}</div>
            <div className="mt-1 text-xs text-muted-foreground">AgentOutput / AgentError</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>反馈记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{details.reduce((sum, item) => sum + item.feedback.length, 0)}</div>
            <div className="mt-1 text-xs text-muted-foreground">人工评分与备注</div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>运行记录</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>运行 ID</Th>
                <Th>类型</Th>
                <Th>状态</Th>
                <Th>输入摘要</Th>
                <Th>输出摘要</Th>
                <Th>模型</Th>
                <Th>token</Th>
                <Th>成本</Th>
                <Th>耗时</Th>
                <Th>错误</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {details.map(({ run, steps, outputs, feedback }) => (
                <tr key={run.id} className={run.id === selectedRunId ? "bg-primary/5" : undefined}>
                  <Td>
                    <div className="font-mono text-xs text-muted-foreground">{run.id}</div>
                  </Td>
                  <Td className="font-medium">{run.agentType.toLowerCase()}</Td>
                  <Td>
                    <AgentStatusBadge status={run.status} />
                  </Td>
                  <Td className="max-w-[220px] truncate text-xs text-muted-foreground">
                    {summarize(run.input)}
                  </Td>
                  <Td className="max-w-[220px] truncate text-xs text-muted-foreground">
                    {summarize(run.output)}
                  </Td>
                  <Td className="text-xs text-muted-foreground">{run.model ?? "-"}</Td>
                  <Td>{run.tokenUsage?.total ?? 0}</Td>
                  <Td>{formatCost(run.costEstimate)}</Td>
                  <Td>{run.latencyMs}ms</Td>
                  <Td className="text-xs text-red-700">{run.errorMessage ?? "-"}</Td>
                  <Td>
                    <div className="space-y-3">
                      <Link
                        aria-label={`查看 Agent 运行详情：${run.id}`}
                        className={
                          run.id === selectedRunId
                            ? "focus-ring inline-flex h-8 items-center justify-center rounded-md border border-primary bg-primary px-3 text-xs font-medium text-primary-foreground"
                            : "focus-ring inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted"
                        }
                        href={`/agent-runs?runId=${run.id}`}
                      >
                        查看详情
                      </Link>
                      <AgentRunActions
                        runId={run.id}
                        status={run.status}
                        stepCount={steps.length}
                        outputCount={outputs.length}
                        feedbackCount={feedback.length}
                      />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {selected ? (
        <section className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>运行轨迹：{selected.run.id}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md bg-muted px-3 py-2">
                  <div>Agent 类型</div>
                  <div className="mt-1 font-semibold text-foreground">{selected.run.agentType.toLowerCase()}</div>
                </div>
                <div className="rounded-md bg-muted px-3 py-2">
                  <div>模型</div>
                  <div className="mt-1 font-semibold text-foreground">{selected.run.model ?? "-"}</div>
                </div>
                <div className="rounded-md bg-muted px-3 py-2">
                  <div>Token</div>
                  <div className="mt-1 font-semibold text-foreground">{selected.run.tokenUsage?.total ?? 0}</div>
                </div>
                <div className="rounded-md bg-muted px-3 py-2">
                  <div>成本</div>
                  <div className="mt-1 font-semibold text-foreground">{formatCost(selected.run.costEstimate)}</div>
                </div>
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>步骤</Th>
                    <Th>状态</Th>
                    <Th>输入</Th>
                    <Th>输出</Th>
                    <Th>耗时</Th>
                  </tr>
                </thead>
                <tbody>
                  {selected.steps.map((step) => (
                    <tr key={step.id}>
                      <Td className="font-medium">{step.name}</Td>
                      <Td>
                        <AgentStatusBadge status={step.status} />
                      </Td>
                      <Td className="max-w-[220px] truncate text-xs text-muted-foreground">{summarize(step.input, 90)}</Td>
                      <Td className="max-w-[220px] truncate text-xs text-muted-foreground">{summarize(step.output, 90)}</Td>
                      <Td>{step.latencyMs}ms</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Prompt 模板</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {selected.promptTemplate ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="info">{selected.promptTemplate.agentType.toLowerCase()}</Badge>
                      <Badge>v{selected.promptTemplate.version}</Badge>
                      <Badge>{selected.promptTemplate.name}</Badge>
                    </div>
                    <p className="leading-6 text-muted-foreground">{selected.promptTemplate.systemPrompt}</p>
                    <p className="leading-6 text-muted-foreground">{selected.promptTemplate.userPrompt}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">未找到激活模板。</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>输出与反馈</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.outputs.slice(0, 3).map((output) => (
                  <div key={output.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={output.entityType === "AgentError" ? "danger" : "success"}>{output.entityType}</Badge>
                      <span className="text-xs text-muted-foreground">{output.entityId ?? "-"}</span>
                    </div>
                    <div className="mt-2 text-xs leading-5 text-muted-foreground">{summarize(output.payload, 180)}</div>
                  </div>
                ))}
                {selected.feedback.slice(0, 3).map((feedback) => (
                  <div key={feedback.id} className="rounded-md bg-muted px-3 py-2 text-sm">
                    <span className="font-medium">{feedback.rating}/5</span>
                    <span className="ml-2 text-muted-foreground">{feedback.comment ?? "无备注"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}
    </>
  );
}
