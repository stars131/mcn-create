import type { NextRequest } from "next/server";
import { getRequestContext, withApiHandler } from "@/app/api/_utils";
import { exportAgentRunTrace } from "@/server/services/agent-run-service";

function safeTraceFileName(id: string) {
  return `agent-run-${id.replace(/[^a-z0-9_-]+/gi, "-")}-trace.json`;
}

export const GET = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  const trace = exportAgentRunTrace({ workspaceId, userId: user.id, id: params.id });

  return Response.json(trace, {
    headers: {
      "content-disposition": `attachment; filename="${safeTraceFileName(params.id)}"`,
      "cache-control": "no-store"
    }
  });
});
