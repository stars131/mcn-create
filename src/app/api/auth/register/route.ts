import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, publicUser, readJson, withApiHandler } from "@/app/api/_utils";
import { registerUser } from "@/server/auth/auth-service";
import { authCookieName, workspaceCookieName } from "@/server/auth/session";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).default("新成员")
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const input = await readJson(request, registerSchema);
  const { user, workspaceId } = registerUser(input);
  const response = ok({ user: publicUser(user), workspaceId });
  response.cookies.set(authCookieName, `mock:${user.id}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  response.cookies.set(workspaceCookieName, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
});
