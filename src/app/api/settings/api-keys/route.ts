import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { createApiKey, listApiKeys } from "@/server/services/settings-service";

const createSchema = z.object({
  name: z.string().min(1),
  expiresAt: z.string().datetime().optional()
});

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request, { permission: "api_key.manage" });
  return ok(listApiKeys(workspaceId));
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request, { permission: "api_key.manage" });
  const input = await readJson(request, createSchema);
  return ok(createApiKey({ workspaceId, userId: user.id, ...input }));
});
