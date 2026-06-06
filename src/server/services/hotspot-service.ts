import { HotspotAgent } from "@/server/agents";
import { writeAuditLog } from "@/server/audit/audit-service";
import { enqueueAndProcessAgentJob } from "@/server/queue/agent-queue";
import { getWorkspaceScoped, normalizePlatform, store } from "@/server/services/mock-store";
import type { Platform } from "@/types/domain";

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
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "hotspot.refresh",
    entityType: "HotItem",
    summary: `刷新热点：${result.items.length} 条`,
    metadata: { queueJobId: job.id, queueStatus: job.status }
  });
  return result;
}
