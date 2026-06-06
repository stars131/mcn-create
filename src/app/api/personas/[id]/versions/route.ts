import type { NextRequest } from "next/server";
import { getRequestContext, ok } from "@/app/api/_utils";
import { listPersonaVersions } from "@/server/services/persona-service";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { workspaceId } = getRequestContext(request);
  return ok(listPersonaVersions(workspaceId, params.id));
}
