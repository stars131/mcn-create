import type { DataSource, HotItem, Platform, SourceType } from "@/types/domain";

export interface FetchHotspotInput {
  workspaceId: string;
  platforms: Platform[];
  industry?: string;
  keyword?: string;
  window?: "24h" | "7d" | "30d";
}

export interface PlatformDataAdapter {
  id: string;
  platform: Platform;
  sourceType: SourceType;
  listDataSources(workspaceId: string): DataSource[];
  fetchHotspots(input: FetchHotspotInput): Promise<HotItem[]>;
  deleteAuthorizationData(workspaceId: string, dataSourceId: string): Promise<void>;
}
