import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ok, readJson } from "@/app/api/_utils";
import { store } from "@/server/services/mock-store";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const input = await readJson(request, loginSchema);
  const user =
    store.users.find((item) => item.email === input.email) ??
    store.users.find((item) => item.email === process.env.MOCK_AUTH_EMAIL) ??
    store.users[0];
  const response = ok({ user, workspaceId: user.currentWorkspaceId });
  response.cookies.set(process.env.AUTH_COOKIE_NAME ?? "contentos_session", `mock:${user.id}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
}
