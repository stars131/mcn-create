import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { refreshHotspots } from "@/server/services/hotspot-service";

const refreshSchema = z.object({
  platforms: z
    .array(z.enum(["ALL", "DOUYIN", "XIAOHONGSHU", "BILIBILI", "WECHAT", "WEIBO", "KUAISHOU", "VIDEO_ACCOUNT", "OTHER"]))
    .optional(),
  keyword: z.string().optional(),
  industry: z.string().optional()
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, refreshSchema);
  return ok(await refreshHotspots({ workspaceId, userId: user.id, ...input }));
});
