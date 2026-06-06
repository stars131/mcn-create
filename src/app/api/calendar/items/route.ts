import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { createCalendarItem } from "@/server/services/calendar-service";

const schema = z.object({
  title: z.string().min(1),
  platform: z.enum(["ALL", "DOUYIN", "XIAOHONGSHU", "BILIBILI", "WECHAT", "WEIBO", "KUAISHOU", "VIDEO_ACCOUNT", "OTHER"]),
  scheduledAt: z.string().datetime(),
  ownerName: z.string().default("林澈")
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  return ok(createCalendarItem({
    workspaceId,
    userId: user.id,
    title: input.title,
    platform: input.platform,
    scheduledAt: input.scheduledAt,
    ownerName: input.ownerName
  }));
});
