import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { nextId, store } from "@/server/services/mock-store";

const schema = z.object({
  title: z.string().min(1),
  platform: z.enum(["ALL", "DOUYIN", "XIAOHONGSHU", "BILIBILI", "WECHAT", "WEIBO", "KUAISHOU", "VIDEO_ACCOUNT", "OTHER"]),
  scheduledAt: z.string().datetime(),
  ownerName: z.string().default("林澈")
});

export async function POST(request: NextRequest) {
  const { workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  const item = {
    id: nextId("cal"),
    workspaceId,
    title: input.title,
    platform: input.platform,
    scheduledAt: input.scheduledAt,
    ownerName: input.ownerName,
    status: "PLANNED" as const
  };
  store.calendarItems.unshift(item);
  return ok(item);
}
