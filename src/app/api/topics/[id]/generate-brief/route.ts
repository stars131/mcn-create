import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { generateBrief } from "@/server/services/topic-service";

export const POST = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  return ok(generateBrief({ workspaceId, userId: user.id, topicId: params.id }));
});
