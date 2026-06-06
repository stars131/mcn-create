import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ok, readJson } from "@/app/api/_utils";
import { nextId, store } from "@/server/services/mock-store";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).default("新成员")
});

export async function POST(request: NextRequest) {
  const input = await readJson(request, registerSchema);
  const existing = store.users.find((user) => user.email === input.email);
  if (existing) {
    return NextResponse.json({ error: "邮箱已注册" }, { status: 409 });
  }

  const user = {
    id: nextId("user"),
    email: input.email,
    name: input.name,
    currentWorkspaceId: "ws_demo",
    role: "VIEWER" as const
  };
  store.users.push(user);
  return ok({ user });
}
