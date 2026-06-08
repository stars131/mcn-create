import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { getPlatformAuthorizationOverview } from "@/server/services/data-source-service";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request);
  return ok(getPlatformAuthorizationOverview(workspaceId));
});
