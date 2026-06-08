import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { getBrandProfile, updateBrandProfile } from "@/server/services/persona-service";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  positioning: z.string().min(1).optional(),
  promise: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const GET = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { workspaceId } = getRequestContext(request);
  return ok(getBrandProfile(workspaceId, params.id));
});

export const PATCH = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  const patch = await readJson(request, patchSchema);
  return ok(updateBrandProfile({ workspaceId, userId: user.id, id: params.id, patch }));
});
