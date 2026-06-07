import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { addAgentFeedback } from "@/server/services/agent-run-service";

const schema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

export const POST = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  const input = await readJson(request, schema);
  return ok(addAgentFeedback({ workspaceId, userId: user.id, agentRunId: params.id, ...input }));
});
