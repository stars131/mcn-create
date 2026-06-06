import { ActionButton } from "@/components/ui/action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { AgentStatusBadge } from "@/components/ui/status-badge";
import { Table, Td, Th } from "@/components/ui/table";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import { listAgentRuns } from "@/server/services/agent-run-service";

export default function AgentRunsPage() {
  const workspaceId = getCurrentWorkspaceId();
  const runs = listAgentRuns(workspaceId);

  return (
    <>
      <PageHeading
        eyebrow="Agent Runs"
        title="Agent 运行中心"
        description="每次 Agent 调用都记录 workspace、用户、输入、输出、模型、token、成本、耗时、状态和错误信息。"
      />
      <Card>
        <CardHeader>
          <CardTitle>运行记录</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>类型</Th>
                <Th>状态</Th>
                <Th>输入摘要</Th>
                <Th>输出摘要</Th>
                <Th>token</Th>
                <Th>耗时</Th>
                <Th>错误</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <Td className="font-medium">{run.agentType.toLowerCase()}</Td>
                  <Td>
                    <AgentStatusBadge status={run.status} />
                  </Td>
                  <Td className="max-w-[220px] truncate text-xs text-muted-foreground">
                    {JSON.stringify(run.input)}
                  </Td>
                  <Td className="max-w-[220px] truncate text-xs text-muted-foreground">
                    {run.output ? JSON.stringify(run.output) : "-"}
                  </Td>
                  <Td>{run.tokenUsage?.total ?? 0}</Td>
                  <Td>{run.latencyMs}ms</Td>
                  <Td className="text-xs text-red-700">{run.errorMessage ?? "-"}</Td>
                  <Td>
                    <ActionButton
                      endpoint={`/api/agent-runs/${run.id}/retry`}
                      label="重跑"
                      pendingLabel="重跑中"
                      icon="rotateCcw"
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
