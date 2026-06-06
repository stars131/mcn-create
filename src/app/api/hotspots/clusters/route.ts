import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { listHotClusters } from "@/server/services/hotspot-service";

export async function GET(request: NextRequest) {
  const { workspaceId } = getRequestContext(request);
  return ok(listHotClusters(workspaceId));
}
