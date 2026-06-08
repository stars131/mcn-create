import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { createPersona, listPersonas } from "@/server/services/persona-service";

const createSchema = z.object({
  brandProfileId: z.string().min(1).optional(),
  brandName: z.string().min(1).optional(),
  brandIndustry: z.string().min(1).optional(),
  brandPositioning: z.string().min(1).optional(),
  brandPromise: z.string().optional(),
  name: z.string().min(1),
  voiceGuide: z.string().min(1),
  coreAudience: z.string().min(1)
}).refine((input) => input.brandProfileId || input.brandName, {
  message: "brandProfileId or brandName is required",
  path: ["brandName"]
});

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request);
  return ok(listPersonas(workspaceId));
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, createSchema);
  return ok(createPersona({ workspaceId, userId: user.id, ...input }));
});
