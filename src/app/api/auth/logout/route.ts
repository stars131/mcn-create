import type { NextRequest } from "next/server";
import { ok, publicUser, withApiHandler } from "@/app/api/_utils";
import { writeAuditLog } from "@/server/audit/audit-service";
import { authCookieName, workspaceCookieName } from "@/server/auth/session";
import { store } from "@/server/services/mock-store";

function getSessionUser(request: NextRequest) {
  const session = request.cookies.get(authCookieName)?.value;
  const userId = session?.startsWith("mock:") ? session.slice("mock:".length) : null;
  return store.users.find((user) => user.id === userId) ?? null;
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const user = getSessionUser(request);
  if (user) {
    writeAuditLog({
      workspaceId: request.cookies.get(workspaceCookieName)?.value ?? user.currentWorkspaceId,
      userId: user.id,
      action: "auth.logout",
      entityType: "User",
      entityId: user.id,
      summary: `用户退出登录：${user.email}`
    });
  }

  const response = ok({ loggedOut: true, user: user ? publicUser(user) : null });
  response.cookies.set(authCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  response.cookies.set(workspaceCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
});
