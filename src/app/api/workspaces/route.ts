import { z } from "zod";
import { getRequestContext, ok, readJson, withApiHandler } from "@/app/api/_utils";
import { getCurrentUser } from "@/server/auth/session";
import { createWorkspace, listWorkspaces } from "@/server/services/workspace-service";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1),
  organizationName: z.string().optional()
});

export const GET = withApiHandler(async () => {
  const user = getCurrentUser();
  return ok(listWorkspaces(user.email));
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user } = getRequestContext(request, { permission: "workspace.manage" });
  const input = await readJson(request, createSchema);
  return ok(createWorkspace({ ...input, userId: user.id }));
});
