import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/errors";
import {
  addAgentFeedback,
  getAgentRunDetail,
  listAgentRuns,
  parseAgentRunFilters,
  retryAgentRun
} from "@/server/services/agent-run-service";
import { store } from "@/server/services/mock-store";
import type { AgentRun } from "@/types/domain";

describe("agent run service", () => {
  it("filters runs by type, status, and searchable payload text", () => {
    expect(parseAgentRunFilters({ agentType: "RISK", status: "SUCCESS", q: " content_001 " })).toEqual({
      agentType: "RISK",
      status: "SUCCESS",
      q: "content_001"
    });
    expect(parseAgentRunFilters({ agentType: "UNKNOWN", status: "DONE", q: " " })).toEqual({});

    const filtered = listAgentRuns("ws_demo", {
      agentType: "RISK",
      status: "SUCCESS",
      q: "content_001"
    });
    expect(filtered.map((run) => run.id)).toEqual(["run_002"]);
    expect(listAgentRuns("ws_demo", { agentType: "HOTSPOT" }).map((run) => run.id)).toContain("run_001");
    expect(listAgentRuns("ws_brand", { agentType: "RISK" })).toEqual([]);
  });

  it("returns typed errors for missing and in-flight runs", async () => {
    await expect(retryAgentRun({ workspaceId: "ws_demo", userId: "user_owner", id: "missing_run" })).rejects.toThrow(
      ApiError
    );
    await expect(
      retryAgentRun({ workspaceId: "ws_demo", userId: "user_owner", id: "missing_run" })
    ).rejects.toMatchObject({ status: 404 });

    const runningRun: AgentRun = {
      id: `run_${crypto.randomUUID().slice(0, 8)}`,
      workspaceId: "ws_demo",
      userId: "user_owner",
      agentType: "RISK",
      status: "RUNNING",
      input: { content: "测试内容" },
      costEstimate: 0,
      latencyMs: 0,
      createdAt: new Date().toISOString()
    };

    try {
      store.agentRuns.unshift(runningRun);
      await expect(
        retryAgentRun({ workspaceId: "ws_demo", userId: "user_owner", id: runningRun.id })
      ).rejects.toMatchObject({ status: 409 });
    } finally {
      store.agentRuns = store.agentRuns.filter((run) => run.id !== runningRun.id);
    }
  });

  it("retries completed runs with an input snapshot and writes audit logs", async () => {
    const originalRun: AgentRun = {
      id: `run_${crypto.randomUUID().slice(0, 8)}`,
      workspaceId: "ws_demo",
      userId: "user_owner",
      agentType: "RISK",
      status: "SUCCESS",
      input: {
        content: "不要承诺稳赚，也不要绕过平台限制。",
        contentDraftId: "content_001",
        nested: { marker: "original" }
      },
      output: { riskLevel: "HIGH" },
      costEstimate: 0,
      latencyMs: 12,
      createdAt: new Date().toISOString()
    };
    const beforeRunIds = new Set(store.agentRuns.map((run) => run.id));
    const beforeStepIds = new Set(store.agentSteps.map((step) => step.id));
    const beforeOutputIds = new Set(store.agentOutputs.map((output) => output.id));
    const beforeUsageIds = new Set(store.usageEvents.map((event) => event.id));
    const beforeCreditIds = new Set(store.creditLedger.map((entry) => entry.id));
    let retryRunId: string | undefined;

    try {
      store.agentRuns.unshift(originalRun);
      const output = await retryAgentRun({ workspaceId: "ws_demo", userId: "user_owner", id: originalRun.id });
      expect(output).toMatchObject({ riskLevel: "HIGH" });

      const retryRun = store.agentRuns.find((run) => !beforeRunIds.has(run.id) && run.id !== originalRun.id);
      retryRunId = retryRun?.id;
      expect(retryRun).toMatchObject({
        workspaceId: "ws_demo",
        agentType: "RISK",
        status: "SUCCESS"
      });
      expect(retryRun?.input).toMatchObject({
        content: "不要承诺稳赚，也不要绕过平台限制。",
        contentDraftId: "content_001"
      });
      expect(retryRun?.input).not.toHaveProperty("nested");
      expect(retryRun?.input).not.toBe(originalRun.input);
      expect(originalRun.input).toMatchObject({ nested: { marker: "original" } });
      expect(store.auditLogs[0]).toMatchObject({
        action: "agent.retry",
        entityType: "AgentRun",
        metadata: {
          originalRunId: originalRun.id,
          retryRunId: retryRun?.id,
          retryStatus: "SUCCESS"
        }
      });

      const detail = getAgentRunDetail("ws_demo", retryRun!.id);
      expect(detail.steps.map((step) => step.name)).toEqual(["validate_input", "model_call", "persist_result"]);
      expect(detail.steps.every((step) => step.status === "SUCCESS")).toBe(true);
      expect(detail.outputs[0]).toMatchObject({
        workspaceId: "ws_demo",
        agentRunId: retryRun?.id,
        entityType: "AgentOutput"
      });
      expect(detail.promptTemplate).toMatchObject({
        agentType: "RISK",
        name: "risk-check",
        active: true
      });

      const usageEvent = store.usageEvents.find((event) => !beforeUsageIds.has(event.id));
      const creditEntry = store.creditLedger.find((entry) => !beforeCreditIds.has(entry.id));
      expect(usageEvent).toMatchObject({
        workspaceId: "ws_demo",
        userId: "user_owner",
        eventType: "agent.run",
        quantity: 1,
        metadata: {
          agentRunId: retryRun?.id,
          agentType: "RISK",
          status: "SUCCESS",
          model: "mock-contentos-v1"
        }
      });
      expect(creditEntry).toMatchObject({
        workspaceId: "ws_demo",
        reason: "RISK Agent token usage",
        metadata: {
          agentRunId: retryRun?.id,
          usageEventId: usageEvent?.id
        }
      });
      expect(creditEntry?.delta).toBeLessThan(0);
    } finally {
      store.agentRuns = store.agentRuns.filter((run) => beforeRunIds.has(run.id));
      store.agentSteps = store.agentSteps.filter((step) => beforeStepIds.has(step.id));
      store.agentOutputs = store.agentOutputs.filter((output) => beforeOutputIds.has(output.id));
      store.usageEvents = store.usageEvents.filter((event) => beforeUsageIds.has(event.id));
      store.creditLedger = store.creditLedger.filter((entry) => beforeCreditIds.has(entry.id));
      store.auditLogs = store.auditLogs.filter(
        (log) =>
          log.metadata?.originalRunId !== originalRun.id &&
          log.entityId !== originalRun.id &&
          log.entityId !== retryRunId
      );
    }
  });

  it("records feedback for a completed agent run", () => {
    const beforeFeedbackIds = new Set(store.agentFeedback.map((feedback) => feedback.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const feedback = addAgentFeedback({
        workspaceId: "ws_demo",
        userId: "user_owner",
        agentRunId: "run_001",
        rating: 4,
        comment: "热点结果可复用"
      });

      expect(feedback).toMatchObject({
        workspaceId: "ws_demo",
        agentRunId: "run_001",
        userId: "user_owner",
        rating: 4,
        comment: "热点结果可复用"
      });
      expect(getAgentRunDetail("ws_demo", "run_001").feedback[0]).toMatchObject({
        id: feedback.id,
        rating: 4
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "agent.feedback.create",
        entityType: "AgentFeedback",
        entityId: feedback.id,
        metadata: {
          agentRunId: "run_001",
          rating: 4
        }
      });
    } finally {
      store.agentFeedback = store.agentFeedback.filter((feedback) => beforeFeedbackIds.has(feedback.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });

  it("rejects invalid feedback ratings", () => {
    expect(() =>
      addAgentFeedback({
        workspaceId: "ws_demo",
        userId: "user_owner",
        agentRunId: "run_001",
        rating: 6
      })
    ).toThrow(ApiError);
  });
});
