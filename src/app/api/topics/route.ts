import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { createTopic, listTopics } from "@/server/services/topic-service";

const createSchema = z.object({
  title: z.string().min(1),
  angle: z.string().min(1),
  audience: z.string().min(1),
  targetPlatforms: z.array(z.enum(["ALL", "DOUYIN", "XIAOHONGSHU", "BILIBILI", "WECHAT", "WEIBO", "KUAISHOU", "VIDEO_ACCOUNT", "OTHER"]))
});

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request);
  const status = request.nextUrl.searchParams.get("status") as never;
  return ok(listTopics(workspaceId, status));
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, createSchema);
  return ok(createTopic({ workspaceId, userId: user.id, ...input }));
});
