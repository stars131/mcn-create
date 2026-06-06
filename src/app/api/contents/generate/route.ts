import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { generateContent } from "@/server/services/content-service";

const schema = z.object({
  topicId: z.string().min(1),
  personaId: z.string().optional(),
  platform: z.enum(["ALL", "DOUYIN", "XIAOHONGSHU", "BILIBILI", "WECHAT", "WEIBO", "KUAISHOU", "VIDEO_ACCOUNT", "OTHER"]).optional(),
  format: z.string().optional(),
  cta: z.string().optional()
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  return ok(await generateContent({ workspaceId, userId: user.id, ...input }));
});
