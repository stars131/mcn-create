import { AnalyticsAgent, ContentAgent, HotspotAgent, PersonaAgent, RiskCheckAgent, TopicAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import { getWorkspaceScoped, store } from "@/server/services/mock-store";
import type { AgentRun, AgentType } from "@/types/domain";

export function listAgentRuns(workspaceId: string) {
  return getWorkspaceScoped(store.agentRuns, workspaceId);
}

export function getAgentRun(workspaceId: string, id: string) {
  const run = store.agentRuns.find((item) => item.workspaceId === workspaceId && item.id === id);
  if (!run) {
    throw new ApiError("Agent 运行记录不存在", 404);
  }
  return run;
}

function cloneInput(input: unknown) {
  return structuredClone(input);
}

function assertRetryable(run: AgentRun) {
  if (run.status === "PENDING" || run.status === "RUNNING") {
    throw new ApiError("Agent 运行尚未结束，不能重试", 409);
  }
}

async function runAgent(agentType: AgentType, workspaceId: string, userId: string, input: unknown) {
  if (agentType === "HOTSPOT") {
    return new HotspotAgent(workspaceId, userId).run(input);
  }
  if (agentType === "TOPIC") {
    return new TopicAgent(workspaceId, userId).run(input);
  }
  if (agentType === "PERSONA") {
    return new PersonaAgent(workspaceId, userId).run(input);
  }
  if (agentType === "CONTENT") {
    return new ContentAgent(workspaceId, userId).run(input);
  }
  if (agentType === "ANALYTICS") {
    return new AnalyticsAgent(workspaceId, userId).run(input);
  }
  return new RiskCheckAgent(workspaceId, userId).run(input);
}

export async function retryAgentRun(input: { workspaceId: string; userId: string; id: string }) {
  const run = getAgentRun(input.workspaceId, input.id);
  assertRetryable(run);

  const agentType = run.agentType as AgentType;
  const retryInput = cloneInput(run.input);
  const existingRunIds = new Set(store.agentRuns.map((item) => item.id));

  try {
    const result = await runAgent(agentType, input.workspaceId, input.userId, retryInput);
    const retryRun = store.agentRuns.find((item) => !existingRunIds.has(item.id) && item.workspaceId === input.workspaceId);
    writeAuditLog({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: "agent.retry",
      entityType: "AgentRun",
      entityId: retryRun?.id ?? run.id,
      summary: `重试 ${agentType} Agent：${run.id}`,
      metadata: {
        originalRunId: run.id,
        retryRunId: retryRun?.id,
        retryStatus: retryRun?.status ?? "UNKNOWN"
      }
    });
    return result;
  } catch (error) {
    const retryRun = store.agentRuns.find((item) => !existingRunIds.has(item.id) && item.workspaceId === input.workspaceId);
    writeAuditLog({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: "agent.retry.failed",
      entityType: "AgentRun",
      entityId: retryRun?.id ?? run.id,
      summary: `重试 ${agentType} Agent 失败：${run.id}`,
      metadata: {
        originalRunId: run.id,
        retryRunId: retryRun?.id,
        errorMessage: error instanceof Error ? error.message : "未知 Agent 重试错误"
      }
    });
    throw error;
  }
}
