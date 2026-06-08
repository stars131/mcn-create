import type { NextRequest } from "next/server";
import { ApiError, getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { markNotificationRead } from "@/server/services/notification-service";

export const PATCH = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { workspaceId } = getRequestContext(request);
  const notification = markNotificationRead(workspaceId, params.id);
  if (!notification) {
    throw new ApiError("通知不存在", 404);
  }
  return ok(notification);
});
