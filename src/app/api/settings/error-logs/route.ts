import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { listPublicErrorLogs } from "@/server/observability/error-log-service";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request, { permission: "workspace.manage" });
  return ok(listPublicErrorLogs(workspaceId));
});
