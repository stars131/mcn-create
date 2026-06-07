import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { createWebhookEndpoint, listWebhookEndpoints } from "@/server/services/settings-service";

const createSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1)
});

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request, { permission: "api_key.manage" });
  return ok(listWebhookEndpoints(workspaceId));
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request, { permission: "api_key.manage" });
  const input = await readJson(request, createSchema);
  return ok(createWebhookEndpoint({ workspaceId, userId: user.id, ...input }));
});
