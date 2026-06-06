import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { reviewContent } from "@/server/services/content-service";

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "IN_REVIEW"]),
  comment: z.string().optional()
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  return ok(reviewContent({ workspaceId, userId: user.id, id: params.id, ...input }));
}
