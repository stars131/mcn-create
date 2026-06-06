import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson } from "@/app/api/_utils";
import { deleteAuthorizationData, updateDataSource } from "@/server/services/data-source-service";

const schema = z.object({
  name: z.string().optional(),
  authorizationStatus: z.enum(["CONNECTED", "DISCONNECTED", "EXPIRED", "REVOKED", "MOCKED"]).optional(),
  notes: z.string().optional()
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspaceId } = getRequestContext(request);
  const patch = await readJson(request, schema);
  return ok(updateDataSource({ workspaceId, userId: user.id, id: params.id, patch }));
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspaceId } = getRequestContext(request);
  return ok(await deleteAuthorizationData({ workspaceId, userId: user.id, id: params.id }));
}
