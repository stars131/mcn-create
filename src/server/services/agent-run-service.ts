import { AnalyticsAgent, ContentAgent, HotspotAgent, PersonaAgent, RiskCheckAgent, TopicAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { AgentFeedback, AgentOutput, AgentPromptTemplate, AgentRun, AgentStep, AgentType } from "@/types/domain";

export interface AgentRunDetail {
  run: AgentRun;
  steps: AgentStep[];
  outputs: AgentOutput[];
  feedback: AgentFeedback[];
  promptTemplate?: AgentPromptTemplate;
}

export function listAgentRuns(workspaceId: string) {
  return getWorkspaceScoped(store.agentRuns, workspaceId);
}

export function getAgentRunDetail(workspaceId: string, id: string): AgentRunDetail {
  const run = getAgentRun(workspaceId, id);
  const promptTemplate = store.agentPromptTemplates.find(
    (template) => template.agentType === run.agentType && template.active
  );

  return {
    run,
    steps: store.agentSteps.filter((step) => step.workspaceId === workspaceId && step.agentRunId === id),
    outputs: store.agentOutputs.filter((output) => output.workspaceId === workspaceId && output.agentRunId === id),
    feedback: store.agentFeedback.filter((feedback) => feedback.workspaceId === workspaceId && feedback.agentRunId === id),
    promptTemplate
  };
}

export function listAgentRunDetails(workspaceId: string) {
  return listAgentRuns(workspaceId).map((run) => getAgentRunDetail(workspaceId, run.id));
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

export function addAgentFeedback(input: {
  workspaceId: string;
  userId: string;
  agentRunId: string;
  rating: number;
  comment?: string;
}) {
  getAgentRun(input.workspaceId, input.agentRunId);
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new ApiError("反馈评分必须是 1-5 的整数", 422);
  }

  const now = new Date().toISOString();
  const feedback: AgentFeedback = {
    id: nextId("agent_feedback"),
    workspaceId: input.workspaceId,
    agentRunId: input.agentRunId,
    userId: input.userId,
    rating: input.rating,
    comment: input.comment?.trim() || undefined,
    createdAt: now,
    updatedAt: now
  };
  store.agentFeedback.unshift(feedback);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "agent.feedback.create",
    entityType: "AgentFeedback",
    entityId: feedback.id,
    summary: `记录 Agent 反馈：${input.agentRunId}`,
    metadata: {
      agentRunId: input.agentRunId,
      rating: input.rating
    }
  });
  return feedback;
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
