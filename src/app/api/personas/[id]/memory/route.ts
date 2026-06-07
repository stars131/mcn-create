import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { getPersonaMemoryDetail } from "@/server/services/persona-service";

export const GET = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { workspaceId } = getRequestContext(request);
  return ok(getPersonaMemoryDetail(workspaceId, params.id));
});
