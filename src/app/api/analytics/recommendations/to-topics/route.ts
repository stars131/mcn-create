import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { recommendationsToTopics } from "@/server/services/analytics-service";

export async function POST(request: NextRequest) {
  const { user, workspaceId } = getRequestContext(request);
  return ok(recommendationsToTopics({ workspaceId, userId: user.id }));
}
