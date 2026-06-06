import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { getAgentRun } from "@/server/services/agent-run-service";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { workspaceId } = getRequestContext(request);
  return ok(getAgentRun(workspaceId, params.id));
}
