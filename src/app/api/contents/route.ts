import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { listContents } from "@/server/services/content-service";

export async function GET(request: NextRequest) {
  const { workspaceId } = getRequestContext(request);
  return ok(listContents(workspaceId));
}
