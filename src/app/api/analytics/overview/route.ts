import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { getAnalyticsOverview } from "@/server/services/analytics-service";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request);
  return ok(getAnalyticsOverview(workspaceId));
});
