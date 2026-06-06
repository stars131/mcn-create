import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { refreshHotspots } from "@/server/services/hotspot-service";

const refreshSchema = z.object({
  platforms: z
    .array(z.enum(["ALL", "DOUYIN", "XIAOHONGSHU", "BILIBILI", "WECHAT", "WEIBO", "KUAISHOU", "VIDEO_ACCOUNT", "OTHER"]))
    .optional(),
  keyword: z.string().optional(),
  industry: z.string().optional()
});

export async function POST(request: NextRequest) {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, refreshSchema);
  return ok(await refreshHotspots({ workspaceId, userId: user.id, ...input }));
}
