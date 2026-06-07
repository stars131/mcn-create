import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { getTopicRuntimeDetail } from "@/server/services/topic-service";

export const GET = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { workspaceId } = getRequestContext(request);
  return ok(getTopicRuntimeDetail(workspaceId, params.id));
});
