import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { createDataSource, listDataSources } from "@/server/services/data-source-service";

const schema = z.object({
  name: z.string().min(1),
  sourceType: z.enum(["OFFICIAL_API", "USER_AUTHORIZED", "USER_UPLOAD", "PUBLIC_COMPLIANT", "THIRD_PARTY_LEGAL", "MOCK"]),
  platform: z.enum(["ALL", "DOUYIN", "XIAOHONGSHU", "BILIBILI", "WECHAT", "WEIBO", "KUAISHOU", "VIDEO_ACCOUNT", "OTHER"]),
  authorizationStatus: z.enum(["CONNECTED", "DISCONNECTED", "EXPIRED", "REVOKED", "MOCKED"]).optional(),
  notes: z.string().optional()
});

export async function GET(request: NextRequest) {
  const { workspaceId } = getRequestContext(request);
  return ok(listDataSources(workspaceId));
}

export async function POST(request: NextRequest) {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  return ok(createDataSource({ workspaceId, userId: user.id, ...input }));
}
