import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { getPersona, updatePersona } from "@/server/services/persona-service";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspaceId } = getRequestContext(request);
  const persona = getPersona(workspaceId, params.id);
  return ok(
    updatePersona({
      workspaceId,
      userId: user.id,
      id: params.id,
      patch: { version: persona.version + 1, reviewStatus: "REVIEWING" }
    })
  );
}
