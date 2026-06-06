import { describe, expect, it } from "vitest";
import {
  enqueueAgentJob,
  enqueueAndProcessAgentJob,
  listQueuedJobs,
  processAgentJob
} from "@/server/queue/agent-queue";
import { generateAnalyticsReport } from "@/server/services/analytics-service";
import { refreshHotspots } from "@/server/services/hotspot-service";
import { store } from "@/server/services/mock-store";

describe("agent queue", () => {
  it("tracks status, result and latency for processed jobs", async () => {
    const { job, result } = await enqueueAndProcessAgentJob(
      "test.double",
      { value: 21 },
      async (payload) => payload.value * 2
    );

    expect(result).toBe(42);
    expect(job).toMatchObject({
      name: "test.double",
      status: "COMPLETED",
      attempts: 1,
      result: 42
    });
    expect(job.startedAt).toBeTruthy();
    expect(job.completedAt).toBeTruthy();
    expect(job.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("marks failed jobs without swallowing processor errors", async () => {
    const job = enqueueAgentJob("test.fail", { reason: "boom" });

    await expect(
      processAgentJob(job, async () => {
        throw new Error("processor failed");
      })
    ).rejects.toThrow("processor failed");

    expect(job).toMatchObject({
      status: "FAILED",
      attempts: 1,
      errorMessage: "processor failed"
    });
    expect(job.failedAt).toBeTruthy();
  });

  it("runs hotspot refresh and analytics reports through queued agent jobs", async () => {
    const beforeJobs = listQueuedJobs().length;
    const beforeReports = store.analyticsReports.length;
    const beforeTopics = store.topics.length;

    try {
      const hotspots = await refreshHotspots({ workspaceId: "ws_demo", userId: "user_owner" });
      const report = await generateAnalyticsReport({ workspaceId: "ws_demo", userId: "user_owner", period: "本周" });

      const newJobs = listQueuedJobs().slice(beforeJobs);
      expect(hotspots.items.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(newJobs.map((job) => job.name)).toEqual(["agent.hotspot.refresh", "agent.analytics.report"]);
      expect(newJobs.every((job) => job.status === "COMPLETED")).toBe(true);
      expect(newJobs.every((job) => job.attempts === 1)).toBe(true);
      expect(store.auditLogs[0]).toMatchObject({
        action: "analytics.report.generate",
        entityType: "AnalyticsReport"
      });
      expect(store.auditLogs[1]).toMatchObject({
        action: "agent.analytics.success",
        entityType: "AgentRun"
      });
      expect(store.auditLogs[0].metadata?.queueJobId).toBeTruthy();
      expect(store.auditLogs.some((log) => log.action === "hotspot.refresh" && log.metadata?.queueJobId)).toBe(true);
    } finally {
      store.analyticsReports.splice(0, store.analyticsReports.length - beforeReports);
      store.topics.splice(0, store.topics.length - beforeTopics);
    }
  });
});
