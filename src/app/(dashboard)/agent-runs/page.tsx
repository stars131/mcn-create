import Link from "next/link";
import { AgentRunActions } from "@/components/agent-runs/agent-run-actions";
import { AgentRunTraceCopyAction } from "@/components/agent-runs/agent-run-trace-copy-action";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { AgentStatusBadge } from "@/components/ui/status-badge";
import { Table, Td, Th } from "@/components/ui/table";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import {
  agentRunStatusOptions,
  agentRunTypeOptions,
  listAgentRunDetails,
  parseAgentRunFilters
} from "@/server/services/agent-run-service";
import type { AgentStatus, AgentType } from "@/types/domain";

const agentTypeLabels: Record<AgentType, string> = {
  HOTSPOT: "hotspot",
  TOPIC: "topic",
  PERSONA: "persona",
  CONTENT: "content",
  ANALYTICS: "analytics",
  RISK: "risk"
};

const agentStatusLabels: Record<AgentStatus, string> = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed"
};

function summarize(value: unknown, maxLength = 110) {
  const text = stringifyTraceValue(value);
  if (!text) {
    return "-";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function stringifyTraceValue(value: unknown, pretty = false) {
  if (value === undefined || value === null) {
    return "未记录";
  }

  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, pretty ? 2 : 0);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, pretty ? 2 : 0) ?? String(value);
  } catch {
    return String(value);
  }
}

function TraceJsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="border-b border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground">{title}</div>
      <pre
        aria-label={title}
        className="max-h-72 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] leading-5 text-muted-foreground"
      >
        {stringifyTraceValue(value, true)}
      </pre>
    </div>
  );
}

function formatCost(value: number) {
  return `¥${value.toFixed(4)}`;
}

function buildAgentRunHref(runId: string, filters: ReturnType<typeof parseAgentRunFilters>) {
  const params = new URLSearchParams({ runId });
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.agentType) {
    params.set("agentType", filters.agentType);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }

  return `/agent-runs?${params.toString()}`;
}

function buildAgentRunExportHref(runId: string) {
  return `/api/agent-runs/${encodeURIComponent(runId)}/export`;
}

interface AgentRunsPageProps {
  searchParams?: {
    runId?: string;
    agentType?: string;
    status?: string;
    q?: string;
  };
}

export default function AgentRunsPage({ searchParams }: AgentRunsPageProps) {
  const workspaceId = getCurrentWorkspaceId();
  const filters = parseAgentRunFilters(searchParams ?? {});
  const details = listAgentRunDetails(workspaceId, filters);
  const latest = details[0];
  const selected = details.find((detail) => detail.run.id === searchParams?.runId) ?? latest;
  const selectedRunId = selected?.run.id;
  const hasFilters = Boolean(filters.agentType || filters.status || filters.q);

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
            <div className="mt-1 text-xs text-muted-foreground">{hasFilters ? "筛选结果" : "当前 workspace"}</div>
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
          <CardTitle>筛选运行记录</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto_auto]" role="search">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">搜索</span>
              <input
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                defaultValue={filters.q ?? ""}
                name="q"
                placeholder="运行 ID、模型、输入或输出"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Agent 类型</span>
              <select
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                defaultValue={filters.agentType ?? ""}
                name="agentType"
              >
                <option value="">全部类型</option>
                {agentRunTypeOptions.map((agentType) => (
                  <option key={agentType} value={agentType}>
                    {agentTypeLabels[agentType]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">状态</span>
              <select
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                defaultValue={filters.status ?? ""}
                name="status"
              >
                <option value="">全部状态</option>
                {agentRunStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {agentStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                className="focus-ring inline-flex h-9 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                type="submit"
              >
                筛选
              </button>
            </div>
            <div className="flex items-end">
              <Link
                className="focus-ring inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-muted"
                href="/agent-runs"
              >
                重置
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

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
                        href={buildAgentRunHref(run.id, filters)}
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
              {details.length === 0 ? (
                <tr>
                  <Td colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                    未找到匹配的 Agent 运行记录。
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {selected ? (
        <section className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>运行轨迹：{selected.run.id}</CardTitle>
                <Link
                  className="focus-ring inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted"
                  href={buildAgentRunExportHref(selected.run.id)}
                >
                  导出 trace
                </Link>
                <AgentRunTraceCopyAction
                  runId={selected.run.id}
                  exportHref={buildAgentRunExportHref(selected.run.id)}
                />
              </div>
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
              <div className="grid gap-3 lg:grid-cols-3">
                <TraceJsonBlock title="运行输入 JSON" value={selected.run.input} />
                <TraceJsonBlock title="运行输出 JSON" value={selected.run.output} />
                <TraceJsonBlock title="Token Usage JSON" value={selected.run.tokenUsage ?? { total: 0 }} />
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
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">步骤载荷</h3>
                {selected.steps.map((step) => (
                  <div key={`${step.id}-payload`} className="space-y-3 rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">{step.name}</span>
                      <AgentStatusBadge status={step.status} />
                      <span className="text-xs text-muted-foreground">{step.latencyMs}ms</span>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-3">
                      <TraceJsonBlock title="步骤输入 JSON" value={step.input} />
                      <TraceJsonBlock title="步骤输出 JSON" value={step.output} />
                      <TraceJsonBlock title="步骤错误" value={step.errorMessage ?? "无"} />
                    </div>
                  </div>
                ))}
              </div>
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
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">AgentOutput 载荷</h3>
                  {selected.outputs.map((output) => (
                    <div key={output.id} className="space-y-3 rounded-md border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={output.entityType === "AgentError" ? "danger" : "success"}>{output.entityType}</Badge>
                        <span className="text-xs text-muted-foreground">{output.entityId ?? "-"}</span>
                      </div>
                      <TraceJsonBlock title={`${output.entityType} JSON`} value={output.payload} />
                    </div>
                  ))}
                  {selected.outputs.length === 0 ? (
                    <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">暂无结构化输出。</p>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">反馈列表</h3>
                  {selected.feedback.map((feedback) => (
                    <div key={feedback.id} className="space-y-3 rounded-md bg-muted px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{feedback.rating}/5</span>
                        <span className="ml-2 text-muted-foreground">{feedback.comment ?? "无备注"}</span>
                      </div>
                      <TraceJsonBlock title="反馈 JSON" value={feedback} />
                    </div>
                  ))}
                  {selected.feedback.length === 0 ? (
                    <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">暂无人工反馈。</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}
    </>
  );
}
