import { ok, publicUser, withApiHandler } from "@/app/api/_utils";
import { getCurrentUser } from "@/server/auth/session";
import { listWorkspaces } from "@/server/services/workspace-service";

export const GET = withApiHandler(async () => {
  const user = getCurrentUser();
  return ok({ user: publicUser(user), workspaces: listWorkspaces(user.email) });
});
