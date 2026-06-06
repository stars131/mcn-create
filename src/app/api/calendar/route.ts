import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { getWorkspaceScoped, store } from "@/server/services/mock-store";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request);
  return ok(getWorkspaceScoped(store.calendarItems, workspaceId));
});
