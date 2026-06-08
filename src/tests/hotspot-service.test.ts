import { describe, expect, it } from "vitest";
import {
  getHotspotRuntimeOverview,
  listHotSignals,
  listHotTrendSnapshots,
  refreshHotspots
} from "@/server/services/hotspot-service";
import { store } from "@/server/services/mock-store";

describe("hotspot service runtime records", () => {
  it("lists seeded hotspot signals, trend snapshots, competitors, and keyword watches", () => {
    const overview = getHotspotRuntimeOverview("ws_demo");

    expect(overview.signals.map((signal) => signal.signalType)).toEqual(
      expect.arrayContaining(["growth_spike", "persona_fit"])
    );
    expect(overview.trendSnapshots.some((snapshot) => snapshot.hotItemId === "hot_001")).toBe(true);
    expect(overview.competitorAccounts[0]).toMatchObject({
      workspaceId: "ws_demo",
      sourceType: "PUBLIC_COMPLIANT"
    });
    expect(overview.keywordWatches.map((watch) => watch.keyword)).toEqual(
      expect.arrayContaining(["人设记忆", "多平台改写"])
    );
  });

  it("records refresh signals and trend snapshots with audit metadata", async () => {
    const beforeSignalIds = new Set(store.hotSignals.map((signal) => signal.id));
    const beforeSnapshotIds = new Set(store.hotTrendSnapshots.map((snapshot) => snapshot.id));
    const beforeAgentRunIds = new Set(store.agentRuns.map((run) => run.id));
    const beforeStepIds = new Set(store.agentSteps.map((step) => step.id));
    const beforeOutputIds = new Set(store.agentOutputs.map((output) => output.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const output = await refreshHotspots({
        workspaceId: "ws_demo",
        userId: "user_owner",
        platforms: ["XIAOHONGSHU"],
        keyword: "AI",
        industry: "内容运营"
      });
      const createdSignals = store.hotSignals.filter((signal) => !beforeSignalIds.has(signal.id));
      const createdSnapshots = store.hotTrendSnapshots.filter((snapshot) => !beforeSnapshotIds.has(snapshot.id));

      expect(output.items.length).toBeGreaterThan(0);
      expect(createdSignals).toHaveLength(output.items.length);
      expect(createdSignals[0]).toMatchObject({
        workspaceId: "ws_demo",
        signalType: "growth_spike",
        metadata: {
          keyword: "AI",
          industry: "内容运营",
          sourceType: "MOCK"
        }
      });
      expect(createdSnapshots.length).toBeGreaterThanOrEqual(output.items.length);
      expect(listHotSignals("ws_demo", output.items[0].id)[0].hotItemId).toBe(output.items[0].id);
      expect(listHotTrendSnapshots("ws_demo", output.items[0].id)[0].hotItemId).toBe(output.items[0].id);
      expect(store.auditLogs[0]).toMatchObject({
        action: "hotspot.refresh",
        metadata: {
          signalIds: createdSignals.map((signal) => signal.id),
          trendSnapshotIds: createdSnapshots.map((snapshot) => snapshot.id)
        }
      });
    } finally {
      store.hotSignals = store.hotSignals.filter((signal) => beforeSignalIds.has(signal.id));
      store.hotTrendSnapshots = store.hotTrendSnapshots.filter((snapshot) => beforeSnapshotIds.has(snapshot.id));
      store.agentRuns = store.agentRuns.filter((run) => beforeAgentRunIds.has(run.id));
      store.agentSteps = store.agentSteps.filter((step) => beforeStepIds.has(step.id));
      store.agentOutputs = store.agentOutputs.filter((output) => beforeOutputIds.has(output.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });
});
