import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { retryAgentRun } from "@/server/services/agent-run-service";

export const POST = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  return ok(await retryAgentRun({ workspaceId, userId: user.id, id: params.id }));
});
