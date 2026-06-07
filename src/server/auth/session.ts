import { cookies } from "next/headers";
import { store } from "@/server/services/mock-store";
import type { User } from "@/types/domain";

export const authCookieName = process.env.AUTH_COOKIE_NAME ?? "contentos_session";
export const workspaceCookieName = process.env.WORKSPACE_COOKIE_NAME ?? "contentos_workspace";

export function getCurrentUser() {
  const session = cookies().get(authCookieName)?.value;
  const userId = session?.replace("mock:", "");
  return store.users.find((user) => user.id === userId) ?? store.users[0];
}

export function canAccessWorkspace(user: User, workspaceId: string) {
  return store.teamMembers.some((member) => member.workspaceId === workspaceId && member.email === user.email);
}

export function getCurrentWorkspaceId(searchWorkspaceId?: string | null) {
  const user = getCurrentUser();
  const cookieWorkspaceId = cookies().get(workspaceCookieName)?.value;
  const preferredWorkspaceId = searchWorkspaceId || cookieWorkspaceId || user.currentWorkspaceId;

  if (preferredWorkspaceId && canAccessWorkspace(user, preferredWorkspaceId)) {
    return preferredWorkspaceId;
  }

  if (canAccessWorkspace(user, user.currentWorkspaceId)) {
    return user.currentWorkspaceId;
  }

  return store.teamMembers.find((member) => member.email === user.email)?.workspaceId ?? user.currentWorkspaceId;
}
