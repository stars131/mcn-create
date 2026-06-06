import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { deleteAuthorizationData, updateDataSource } from "@/server/services/data-source-service";

const schema = z.object({
  name: z.string().optional(),
  authorizationStatus: z.enum(["CONNECTED", "DISCONNECTED", "EXPIRED", "REVOKED", "MOCKED"]).optional(),
  notes: z.string().optional()
});

export const PATCH = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  const patch = await readJson(request, schema);
  return ok(updateDataSource({ workspaceId, userId: user.id, id: params.id, patch }));
});

export const DELETE = withApiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { user, workspaceId } = getRequestContext(request);
  return ok(await deleteAuthorizationData({ workspaceId, userId: user.id, id: params.id }));
});
