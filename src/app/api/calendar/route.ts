import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { getWorkspaceScoped, store } from "@/server/services/mock-store";

export async function GET(request: NextRequest) {
  const { workspaceId } = getRequestContext(request);
  return ok(getWorkspaceScoped(store.calendarItems, workspaceId));
}
