import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { importMetricData } from "@/server/services/analytics-service";

const recordSchema = z.object({
  title: z.string().min(1),
  platform: z.enum(["ALL", "DOUYIN", "XIAOHONGSHU", "BILIBILI", "WECHAT", "WEIBO", "KUAISHOU", "VIDEO_ACCOUNT", "OTHER"]),
  views: z.coerce.number().int().nonnegative(),
  likes: z.coerce.number().int().nonnegative(),
  comments: z.coerce.number().int().nonnegative(),
  shares: z.coerce.number().int().nonnegative(),
  conversions: z.coerce.number().int().nonnegative()
});

const schema = z.object({
  records: z.array(recordSchema).min(1)
});

export async function POST(request: NextRequest) {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  return ok(importMetricData({ workspaceId, userId: user.id, records: input.records }));
}
