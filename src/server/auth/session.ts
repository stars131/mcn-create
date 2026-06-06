import { cookies } from "next/headers";
import { store } from "@/server/services/mock-store";

export function getCurrentUser() {
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "contentos_session";
  const session = cookies().get(cookieName)?.value;
  const userId = session?.replace("mock:", "");
  return store.users.find((user) => user.id === userId) ?? store.users[0];
}

export function getCurrentWorkspaceId(searchWorkspaceId?: string | null) {
  return searchWorkspaceId || getCurrentUser().currentWorkspaceId;
}
