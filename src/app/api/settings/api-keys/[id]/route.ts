import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { revokeApiKey } from "@/server/services/settings-service";

export const DELETE = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request, { permission: "api_key.manage" });
  return ok(revokeApiKey({ workspaceId, userId: user.id, id: params.id }));
});
