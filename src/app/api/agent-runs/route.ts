import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { listAgentRuns, parseAgentRunFilters } from "@/server/services/agent-run-service";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request);
  const filters = parseAgentRunFilters({
    agentType: request.nextUrl.searchParams.get("agentType"),
    status: request.nextUrl.searchParams.get("status"),
    q: request.nextUrl.searchParams.get("q")
  });
  return ok(listAgentRuns(workspaceId, filters));
});
