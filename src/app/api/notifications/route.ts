import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { listNotifications } from "@/server/services/notification-service";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { user, workspaceId } = getRequestContext(request);
  return ok(listNotifications(workspaceId, user.id));
});
