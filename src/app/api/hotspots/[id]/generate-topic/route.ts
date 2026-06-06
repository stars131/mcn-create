import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { generateTopicsFromHotspot } from "@/server/services/topic-service";

export const POST = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  return ok(await generateTopicsFromHotspot({ workspaceId, userId: user.id, hotItemId: params.id }));
});
