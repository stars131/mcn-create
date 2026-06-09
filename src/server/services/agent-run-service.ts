import { AnalyticsAgent, ContentAgent, HotspotAgent, PersonaAgent, RiskCheckAgent, TopicAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type {
  AgentFeedback,
  AgentOutput,
  AgentPromptTemplate,
  AgentRun,
  AgentStatus,
  AgentStep,
  AgentType
} from "@/types/domain";

export interface AgentRunDetail {
  run: AgentRun;
  steps: AgentStep[];
  outputs: AgentOutput[];
  feedback: AgentFeedback[];
  promptTemplate?: AgentPromptTemplate;
}

export interface AgentRunTraceExport {
  schemaVersion: "contentos.agentRunTrace.v1";
  exportedAt: string;
  workspaceId: string;
  runId: string;
  trace: {
    run: unknown;
    steps: unknown[];
    outputs: unknown[];
    feedback: unknown[];
    promptTemplate?: unknown;
  };
}

export interface AgentRunFilters {
  agentType?: AgentType;
  status?: AgentStatus;
  q?: string;
}

export interface AgentRunFailureBucket {
  agentType: AgentType;
  reason: string;
  runCount: number;
  failedStepCount: number;
  agentErrorOutputCount: number;
  latestRunId: string;
  latestFailedAt?: string;
}

export interface AgentRunFailureSummary {
  failedRunCount: number;
  failedStepCount: number;
  agentErrorOutputCount: number;
  affectedAgentTypes: AgentType[];
  latestFailedRun?: AgentRun;
  buckets: AgentRunFailureBucket[];
}

export const agentRunTypeOptions: AgentType[] = ["HOTSPOT", "TOPIC", "PERSONA", "CONTENT", "ANALYTICS", "RISK"];
export const agentRunStatusOptions: AgentStatus[] = ["PENDING", "RUNNING", "SUCCESS", "FAILED"];

export function parseAgentRunFilters(input: {
  agentType?: string | null;
  status?: string | null;
  q?: string | null;
}): AgentRunFilters {
  return {
    agentType: agentRunTypeOptions.includes(input.agentType as AgentType) ? (input.agentType as AgentType) : undefined,
    status: agentRunStatusOptions.includes(input.status as AgentStatus) ? (input.status as AgentStatus) : undefined,
    q: input.q?.trim() || undefined
  };
}

function stringifySearchValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function matchesQuery(run: AgentRun, query: string) {
  const normalizedQuery = query.toLowerCase();
  const haystack = [
    run.id,
    run.agentType,
    run.status,
    run.model,
    run.errorMessage,
    stringifySearchValue(run.input),
    stringifySearchValue(run.output)
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function listAgentRuns(workspaceId: string, filters: AgentRunFilters = {}) {
  return getWorkspaceScoped(store.agentRuns, workspaceId).filter((run) => {
    if (filters.agentType && run.agentType !== filters.agentType) {
      return false;
    }
    if (filters.status && run.status !== filters.status) {
      return false;
    }
    if (filters.q && !matchesQuery(run, filters.q)) {
      return false;
    }
    return true;
  });
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

export function listAgentRunDetails(workspaceId: string, filters: AgentRunFilters = {}) {
  return listAgentRuns(workspaceId, filters).map((run) => getAgentRunDetail(workspaceId, run.id));
}

function getRunFailureTime(run: AgentRun) {
  return run.finishedAt ?? run.updatedAt ?? run.startedAt ?? run.createdAt;
}

function getRunFailureSortValue(run: AgentRun) {
  return Date.parse(getRunFailureTime(run) ?? "") || 0;
}

function getRunFailureReason(run: AgentRun) {
  return run.errorMessage?.trim() || "未知错误";
}

export function summarizeAgentRunFailures(workspaceId: string): AgentRunFailureSummary {
  const failedRuns = listAgentRuns(workspaceId, { status: "FAILED" }).slice().sort((left, right) => {
    return getRunFailureSortValue(right) - getRunFailureSortValue(left);
  });
  const failedRunIds = new Set(failedRuns.map((run) => run.id));
  const failedSteps = store.agentSteps.filter(
    (step) => step.workspaceId === workspaceId && failedRunIds.has(step.agentRunId) && step.status === "FAILED"
  );
  const agentErrorOutputs = store.agentOutputs.filter(
    (output) => output.workspaceId === workspaceId && failedRunIds.has(output.agentRunId) && output.entityType === "AgentError"
  );
  const failedStepCountByRun = new Map<string, number>();
  const agentErrorOutputCountByRun = new Map<string, number>();

  for (const step of failedSteps) {
    failedStepCountByRun.set(step.agentRunId, (failedStepCountByRun.get(step.agentRunId) ?? 0) + 1);
  }
  for (const output of agentErrorOutputs) {
    agentErrorOutputCountByRun.set(output.agentRunId, (agentErrorOutputCountByRun.get(output.agentRunId) ?? 0) + 1);
  }

  const bucketsByKey = new Map<string, AgentRunFailureBucket>();
  const affectedAgentTypes = new Set<AgentType>();
  for (const run of failedRuns) {
    affectedAgentTypes.add(run.agentType);
    const reason = getRunFailureReason(run);
    const key = `${run.agentType}:${reason}`;
    const existing = bucketsByKey.get(key);
    const failedStepCount = failedStepCountByRun.get(run.id) ?? 0;
    const agentErrorOutputCount = agentErrorOutputCountByRun.get(run.id) ?? 0;

    if (existing) {
      existing.runCount += 1;
      existing.failedStepCount += failedStepCount;
      existing.agentErrorOutputCount += agentErrorOutputCount;
      continue;
    }

    bucketsByKey.set(key, {
      agentType: run.agentType,
      reason,
      runCount: 1,
      failedStepCount,
      agentErrorOutputCount,
      latestRunId: run.id,
      latestFailedAt: getRunFailureTime(run)
    });
  }

  return {
    failedRunCount: failedRuns.length,
    failedStepCount: failedSteps.length,
    agentErrorOutputCount: agentErrorOutputs.length,
    affectedAgentTypes: [...affectedAgentTypes],
    latestFailedRun: failedRuns[0],
    buckets: [...bucketsByKey.values()].sort((left, right) => {
      if (right.runCount !== left.runCount) {
        return right.runCount - left.runCount;
      }
      return Date.parse(right.latestFailedAt ?? "") - Date.parse(left.latestFailedAt ?? "");
    })
  };
}

const sensitiveTraceKeys = new Set([
  "accesstoken",
  "apikey",
  "authorization",
  "cookie",
  "keyhash",
  "password",
  "refreshtoken",
  "secret",
  "secrethash",
  "token",
  "tokenref"
]);

function shouldRedactTraceKey(key: string) {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return sensitiveTraceKeys.has(normalizedKey) || normalizedKey.endsWith("secret") || normalizedKey.endsWith("token");
}

function redactTraceValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactTraceValue(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      shouldRedactTraceKey(key) ? "[REDACTED]" : redactTraceValue(item)
    ])
  );
}

export function exportAgentRunTrace(input: {
  workspaceId: string;
  userId: string;
  id: string;
}): AgentRunTraceExport {
  const detail = getAgentRunDetail(input.workspaceId, input.id);
  const exportedAt = new Date().toISOString();
  const trace: AgentRunTraceExport = {
    schemaVersion: "contentos.agentRunTrace.v1",
    exportedAt,
    workspaceId: input.workspaceId,
    runId: input.id,
    trace: {
      run: redactTraceValue(detail.run),
      steps: detail.steps.map((step) => redactTraceValue(step)),
      outputs: detail.outputs.map((output) => redactTraceValue(output)),
      feedback: detail.feedback.map((feedback) => redactTraceValue(feedback)),
      promptTemplate: detail.promptTemplate ? redactTraceValue(detail.promptTemplate) : undefined
    }
  };

  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "agent.trace.export",
    entityType: "AgentRun",
    entityId: input.id,
    summary: `导出 Agent trace：${input.id}`,
    metadata: {
      agentType: detail.run.agentType,
      status: detail.run.status,
      stepCount: detail.steps.length,
      outputCount: detail.outputs.length,
      feedbackCount: detail.feedback.length,
      schemaVersion: trace.schemaVersion
    }
  });

  return trace;
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
