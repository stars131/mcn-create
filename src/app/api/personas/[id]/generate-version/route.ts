import type { NextRequest } from "next/server";
import { getRequestContext, ok, withApiHandler } from "@/app/api/_utils";
import { generatePersonaVersion } from "@/server/services/persona-service";

export const POST = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  return ok(generatePersonaVersion({ workspaceId, userId: user.id, personaId: params.id }));
});
