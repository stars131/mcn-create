import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, publicUser, readJson, withApiHandler } from "@/app/api/_utils";
import { getCurrentUser, workspaceCookieName } from "@/server/auth/session";
import { switchWorkspace } from "@/server/services/workspace-service";

const switchSchema = z.object({
  workspaceId: z.string().min(1)
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const user = getCurrentUser();
  const input = await readJson(request, switchSchema);
  const result = switchWorkspace({ userId: user.id, workspaceId: input.workspaceId });
  const response = ok({ user: publicUser(result.user), workspace: result.workspace });
  response.cookies.set(workspaceCookieName, result.workspace.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
});
