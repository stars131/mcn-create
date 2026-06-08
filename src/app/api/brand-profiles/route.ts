import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { createBrandProfile, listBrandProfiles } from "@/server/services/persona-service";

const createSchema = z.object({
  name: z.string().min(1),
  industry: z.string().min(1).optional(),
  positioning: z.string().min(1).optional(),
  promise: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request);
  return ok(listBrandProfiles(workspaceId));
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, createSchema);
  return ok(createBrandProfile({ workspaceId, userId: user.id, ...input }));
});
