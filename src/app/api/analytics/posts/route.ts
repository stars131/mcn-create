import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { listPostMetrics } from "@/server/services/analytics-service";

export async function GET(request: NextRequest) {
  const { workspaceId } = getRequestContext(request);
  return ok(listPostMetrics(workspaceId));
}
