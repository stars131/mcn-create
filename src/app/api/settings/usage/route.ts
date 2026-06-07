import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { getUsageSummary } from "@/server/services/settings-service";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request, { permission: "workspace.manage" });
  return ok(getUsageSummary(workspaceId));
});
