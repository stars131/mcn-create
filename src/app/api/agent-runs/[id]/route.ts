import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { getAgentRunDetail } from "@/server/services/agent-run-service";

export const GET = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { workspaceId } = getRequestContext(request);
  return ok(getAgentRunDetail(workspaceId, params.id));
});
