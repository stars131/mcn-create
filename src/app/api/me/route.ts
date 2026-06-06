import { ok } from "@/app/api/_utils";
import { getCurrentUser } from "@/server/auth/session";
import { listWorkspaces } from "@/server/services/workspace-service";

export async function GET() {
  const user = getCurrentUser();
  return ok({ user, workspaces: listWorkspaces() });
}
