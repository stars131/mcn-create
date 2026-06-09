import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { exportAuditLogSnapshot, listAuditLogs, parseAuditLogFilters } from "@/server/audit/audit-service";

function safeAuditFileName(workspaceId: string) {
  const safeWorkspaceId = workspaceId.replace(/[^a-z0-9_-]+/gi, "-");
  return `audit-logs-${safeWorkspaceId}.json`;
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  const filters = parseAuditLogFilters({
    action: request.nextUrl.searchParams.get("action"),
    entityType: request.nextUrl.searchParams.get("entityType"),
    q: request.nextUrl.searchParams.get("q"),
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to"),
    limit: request.nextUrl.searchParams.get("limit")
  });

  if (request.nextUrl.searchParams.get("format") === "export") {
    const snapshot = exportAuditLogSnapshot({ workspaceId, userId: user.id, filters });
    return Response.json(snapshot, {
      headers: {
        "content-disposition": `attachment; filename="${safeAuditFileName(workspaceId)}"`,
        "cache-control": "no-store"
      }
    });
  }

  return ok(listAuditLogs(workspaceId, filters));
});
