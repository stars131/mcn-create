import { getWorkspaceScoped, normalizePlatform, store } from "@/server/services/mock-store";
import type { PlatformDataAdapter, FetchHotspotInput } from "@/server/platforms/adapters/platform-adapter";
import type { HotItem } from "@/types/domain";

export const mockPlatformAdapter: PlatformDataAdapter = {
  id: "mock-platform-adapter",
  platform: "ALL",
  sourceType: "MOCK",
  listDataSources(workspaceId) {
    return getWorkspaceScoped(store.dataSources, workspaceId);
  },
  async fetchHotspots(input: FetchHotspotInput) {
    const requested = new Set(input.platforms);
    const platform = normalizePlatform(requested.has("ALL") ? undefined : input.platforms[0]);
    const items = getWorkspaceScoped(store.hotItems, input.workspaceId).filter((item) => {
      const matchPlatform = platform ? item.platform === platform : true;
      const matchIndustry = input.industry ? item.industry.includes(input.industry) : true;
      const matchKeyword = input.keyword ? item.title.includes(input.keyword) : true;
      return matchPlatform && matchIndustry && matchKeyword;
    });

    return items.sort((a: HotItem, b: HotItem) => b.heatScore - a.heatScore);
  },
  async deleteAuthorizationData(workspaceId, dataSourceId) {
    const source = store.dataSources.find((item) => item.workspaceId === workspaceId && item.id === dataSourceId);
    if (source) {
      source.authorizationStatus = "REVOKED";
      source.lastSyncedAt = new Date().toISOString();
      source.notes = "授权数据已删除，保留最小审计记录。";
    }
  }
};
