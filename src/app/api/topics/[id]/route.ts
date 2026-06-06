import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { getTopic, updateTopic } from "@/server/services/topic-service";

const patchSchema = z.object({
  title: z.string().optional(),
  angle: z.string().optional(),
  status: z.enum(["PENDING", "ADOPTED", "WRITING", "PUBLISHED", "DROPPED"]).optional(),
  score: z.number().optional()
});

export const GET = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { workspaceId } = getRequestContext(request);
  return ok(getTopic(workspaceId, params.id));
});

export const PATCH = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  const patch = await readJson(request, patchSchema);
  return ok(updateTopic({ workspaceId, userId: user.id, id: params.id, patch }));
});
