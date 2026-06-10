import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import {
  exportAuditLogCsv,
  exportAuditLogSnapshot,
  listAuditLogPage,
  listAuditLogs,
  parseAuditLogFilters,
  publicAuditLogPage,
  publicAuditLogs
} from "@/server/audit/audit-service";

function safeAuditFileName(workspaceId: string, extension: "json" | "csv") {
  const safeWorkspaceId = workspaceId.replace(/[^a-z0-9_-]+/gi, "-");
  return `audit-logs-${safeWorkspaceId}.${extension}`;
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  const filters = parseAuditLogFilters({
    action: request.nextUrl.searchParams.get("action"),
    entityType: request.nextUrl.searchParams.get("entityType"),
    userId: request.nextUrl.searchParams.get("userId"),
    q: request.nextUrl.searchParams.get("q"),
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to"),
    limit: request.nextUrl.searchParams.get("limit"),
    page: request.nextUrl.searchParams.get("page"),
    pageSize: request.nextUrl.searchParams.get("pageSize")
  });

  const format = request.nextUrl.searchParams.get("format");
  const paginated = request.nextUrl.searchParams.has("page") || request.nextUrl.searchParams.has("pageSize");

  if (format === "csv") {
    const csvExport = exportAuditLogCsv({ workspaceId, userId: user.id, filters });
    return new Response(csvExport.content, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${safeAuditFileName(workspaceId, "csv")}"`,
        "cache-control": "no-store"
      }
    });
  }

  if (format === "export") {
    const snapshot = exportAuditLogSnapshot({ workspaceId, userId: user.id, filters });
    return Response.json(snapshot, {
      headers: {
        "content-disposition": `attachment; filename="${safeAuditFileName(workspaceId, "json")}"`,
        "cache-control": "no-store"
      }
    });
  }

  return ok(
    paginated
      ? publicAuditLogPage(listAuditLogPage(workspaceId, filters))
      : publicAuditLogs(listAuditLogs(workspaceId, filters))
  );
});
