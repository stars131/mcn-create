import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { recommendationsToTopics } from "@/server/services/analytics-service";

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  return ok(recommendationsToTopics({ workspaceId, userId: user.id }));
});
