import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { getHotspotRuntimeOverview } from "@/server/services/hotspot-service";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request);
  return ok(getHotspotRuntimeOverview(workspaceId));
});
