import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { updateMemberRole } from "@/server/services/workspace-service";

const updateSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "EDITOR", "ANALYST", "VIEWER"])
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  const { user } = getRequestContext(request);
  const input = await readJson(request, updateSchema);
  return ok(updateMemberRole({ workspaceId: params.id, memberId: params.memberId, role: input.role, userId: user.id }));
}
