import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { getAnalyticsOverview } from "@/server/services/analytics-service";

export async function GET(request: NextRequest) {
  const { workspaceId } = getRequestContext(request);
  return ok(getAnalyticsOverview(workspaceId));
}
