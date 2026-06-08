import { HotspotAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { enqueueAndProcessAgentJob } from "@/server/queue/agent-queue";
import { getWorkspaceScoped, nextId, normalizePlatform, store } from "@/server/services/mock-store";
import type { HotCluster, HotSignal, HotTrendSnapshot, Platform } from "@/types/domain";

export function listHotspots(input: { workspaceId: string; platform?: string | null; industry?: string | null }) {
  const platform = normalizePlatform(input.platform);
  return getWorkspaceScoped(store.hotItems, input.workspaceId)
    .filter((item) => (platform ? item.platform === platform : true))
    .filter((item) => (input.industry ? item.industry.includes(input.industry) : true))
    .sort((a, b) => b.heatScore - a.heatScore);
}

export function listHotClusters(workspaceId: string) {
  return getWorkspaceScoped(store.hotClusters, workspaceId);
}

export function listHotSignals(workspaceId: string, hotItemId?: string) {
  return getWorkspaceScoped(store.hotSignals, workspaceId)
    .filter((signal) => (hotItemId ? signal.hotItemId === hotItemId : true))
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}

export function listHotTrendSnapshots(workspaceId: string, hotItemId?: string) {
  return getWorkspaceScoped(store.hotTrendSnapshots, workspaceId)
    .filter((snapshot) => (hotItemId ? snapshot.hotItemId === hotItemId : true))
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

export function listCompetitorAccounts(workspaceId: string) {
  return getWorkspaceScoped(store.competitorAccounts, workspaceId).sort((a, b) =>
    a.platform.localeCompare(b.platform) || a.displayName.localeCompare(b.displayName)
  );
}

export function listKeywordWatches(workspaceId: string) {
  return getWorkspaceScoped(store.keywordWatches, workspaceId).sort((a, b) => a.keyword.localeCompare(b.keyword));
}

export function getHotspotRuntimeOverview(workspaceId: string) {
  return {
    signals: listHotSignals(workspaceId),
    trendSnapshots: listHotTrendSnapshots(workspaceId),
    competitorAccounts: listCompetitorAccounts(workspaceId),
    keywordWatches: listKeywordWatches(workspaceId)
  };
}

function matchCluster(workspaceId: string, platform: Platform): HotCluster | undefined {
  return store.hotClusters.find((cluster) => cluster.workspaceId === workspaceId && cluster.platforms.includes(platform));
}

function recordRefreshRuntime(input: {
  workspaceId: string;
  keyword?: string;
  industry?: string;
  platforms: Platform[];
  result: {
    items: Array<{
      id: string;
      title: string;
      platform: Platform;
      heatScore: number;
      growthScore: number;
    }>;
    clusters: Array<{
      name: string;
      heatScore: number;
      growthScore: number;
    }>;
  };
}) {
  const now = new Date().toISOString();
  const signals: HotSignal[] = input.result.items.map((item) => {
    const cluster = matchCluster(input.workspaceId, item.platform);

    return {
      id: nextId("hot_signal"),
      workspaceId: input.workspaceId,
      hotItemId: item.id,
      clusterId: cluster?.id,
      signalType: item.growthScore >= 65 ? "growth_spike" : "refresh_candidate",
      title: `刷新发现：${item.title}`,
      confidence: Number(Math.min(0.96, 0.55 + item.heatScore / 250 + item.growthScore / 500).toFixed(2)),
      detectedAt: now,
      metadata: {
        keyword: input.keyword,
        industry: input.industry,
        platforms: input.platforms,
        sourceType: "MOCK"
      },
      createdAt: now,
      updatedAt: now
    };
  });

  const itemSnapshots: HotTrendSnapshot[] = input.result.items.map((item) => ({
    id: nextId("hot_trend_snapshot"),
    workspaceId: input.workspaceId,
    hotItemId: item.id,
    capturedAt: now,
    heatScore: item.heatScore,
    growthScore: item.growthScore,
    metrics: {
      heatScore: item.heatScore,
      growthScore: item.growthScore,
      platformCount: input.platforms.length
    },
    createdAt: now,
    updatedAt: now
  }));

  const clusterSnapshots: HotTrendSnapshot[] = input.result.clusters.map((cluster) => {
    const existingCluster = store.hotClusters.find(
      (item) => item.workspaceId === input.workspaceId && item.name === cluster.name
    );

    return {
      id: nextId("hot_trend_snapshot"),
      workspaceId: input.workspaceId,
      clusterId: existingCluster?.id,
      capturedAt: now,
      heatScore: cluster.heatScore,
      growthScore: cluster.growthScore,
      metrics: {
        heatScore: cluster.heatScore,
        growthScore: cluster.growthScore,
        itemCount: input.result.items.length
      },
      createdAt: now,
      updatedAt: now
    };
  });

  store.hotSignals.unshift(...signals);
  store.hotTrendSnapshots.unshift(...itemSnapshots, ...clusterSnapshots);

  return {
    signals,
    trendSnapshots: [...itemSnapshots, ...clusterSnapshots]
  };
}

export async function refreshHotspots(input: {
  workspaceId: string;
  userId: string;
  platforms?: Platform[];
  keyword?: string;
  industry?: string;
}) {
  const payload = {
    platforms: input.platforms ?? ["ALL"],
    keyword: input.keyword,
    industry: input.industry,
    competitorAccounts: [],
    window: "24h"
  } as const;
  const { job, result } = await enqueueAndProcessAgentJob("agent.hotspot.refresh", {
    workspaceId: input.workspaceId,
    userId: input.userId,
    input: payload
  }, async (payload) => {
    const agent = new HotspotAgent(payload.workspaceId, payload.userId);
    return agent.run(payload.input);
  });
  const runtime = recordRefreshRuntime({
    workspaceId: input.workspaceId,
    keyword: input.keyword,
    industry: input.industry,
    platforms: payload.platforms,
    result
  });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "hotspot.refresh",
    entityType: "HotItem",
    summary: `刷新热点：${result.items.length} 条`,
    metadata: {
      queueJobId: job.id,
      queueStatus: job.status,
      signalIds: runtime.signals.map((signal) => signal.id),
      trendSnapshotIds: runtime.trendSnapshots.map((snapshot) => snapshot.id)
    }
  });
  return result;
}
