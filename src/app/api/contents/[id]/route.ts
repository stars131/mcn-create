import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { getContent, updateContent } from "@/server/services/content-service";

const patchSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED", "SCHEDULED", "PUBLISHED"]).optional()
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { workspaceId } = getRequestContext(request);
  return ok(getContent(workspaceId, params.id));
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspaceId } = getRequestContext(request);
  const patch = await readJson(request, patchSchema);
  return ok(updateContent({ workspaceId, userId: user.id, id: params.id, patch }));
}
