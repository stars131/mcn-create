import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { listHotspots } from "@/server/services/hotspot-service";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request);
  return ok(
    listHotspots({
      workspaceId,
      platform: request.nextUrl.searchParams.get("platform"),
      industry: request.nextUrl.searchParams.get("industry")
    })
  );
});
