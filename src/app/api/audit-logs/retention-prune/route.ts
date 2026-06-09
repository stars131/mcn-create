import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { pruneAuditLogsByRetentionPolicy } from "@/server/audit/audit-service";

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request, { permission: "workspace.manage" });
  return ok(pruneAuditLogsByRetentionPolicy({ workspaceId, userId: user.id }));
});
