import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { listAuditLogs } from "@/server/audit/audit-service";

export async function GET(request: NextRequest) {
  const { workspaceId } = getRequestContext(request);
  return ok(listAuditLogs(workspaceId));
}
