import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, getCurrentWorkspaceId } from "@/server/auth/session";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "请求处理失败";
  return NextResponse.json({ error: message }, { status });
}

export async function readJson<TSchema extends z.ZodTypeAny>(request: NextRequest, schema: TSchema) {
  const body = await request.json().catch(() => ({}));
  return schema.parse(body) as z.infer<TSchema>;
}

export function getRequestContext(request: NextRequest) {
  const user = getCurrentUser();
  const workspaceId = getCurrentWorkspaceId(request.nextUrl.searchParams.get("workspaceId"));
  return { user, workspaceId };
}
