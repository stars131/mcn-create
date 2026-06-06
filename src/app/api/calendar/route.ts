import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { listCalendarItems } from "@/server/services/calendar-service";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { workspaceId } = getRequestContext(request);
  return ok(listCalendarItems(workspaceId));
});
