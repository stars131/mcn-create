import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { getPersona, updatePersona } from "@/server/services/persona-service";

const patchSchema = z.object({
  voiceGuide: z.string().optional(),
  coreAudience: z.string().optional(),
  highFrequencyWords: z.array(z.string()).optional(),
  forbiddenExpressions: z.array(z.string()).optional(),
  targetAudiences: z.array(z.string()).optional(),
  toneExamples: z.array(z.string()).optional()
});

export const GET = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { workspaceId } = getRequestContext(request);
  return ok(getPersona(workspaceId, params.id));
});

export const PATCH = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  const patch = await readJson(request, patchSchema);
  return ok(updatePersona({ workspaceId, userId: user.id, id: params.id, patch }));
});
