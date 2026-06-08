import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { listInvitations } from "@/server/services/workspace-service";

export const GET = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  getRequestContext(request, { workspaceId: params.id, permission: "member.manage" });
  return ok(listInvitations(params.id));
});
