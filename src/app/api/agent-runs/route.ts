import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { listAgentRuns } from "@/server/services/agent-run-service";

export async function GET(request: NextRequest) {
  const { workspaceId } = getRequestContext(request);
  return ok(listAgentRuns(workspaceId));
}
