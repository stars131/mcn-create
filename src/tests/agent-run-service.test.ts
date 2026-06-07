import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/errors";
import { retryAgentRun } from "@/server/services/agent-run-service";
import { store } from "@/server/services/mock-store";
import type { AgentRun } from "@/types/domain";

describe("agent run service", () => {
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
    } finally {
      store.agentRuns = store.agentRuns.filter((run) => beforeRunIds.has(run.id));
      store.auditLogs = store.auditLogs.filter(
        (log) =>
          log.metadata?.originalRunId !== originalRun.id &&
          log.entityId !== originalRun.id &&
          log.entityId !== retryRunId
      );
    }
  });
});
