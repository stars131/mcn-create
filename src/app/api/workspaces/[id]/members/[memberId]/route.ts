import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { updateMemberRole } from "@/server/services/workspace-service";

const updateSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "EDITOR", "ANALYST", "VIEWER"])
});

export const PATCH = withApiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) => {
  const { user } = getRequestContext(request, { workspaceId: params.id, permission: "member.manage" });
  const input = await readJson(request, updateSchema);
  return ok(updateMemberRole({ workspaceId: params.id, memberId: params.memberId, role: input.role, userId: user.id }));
});
