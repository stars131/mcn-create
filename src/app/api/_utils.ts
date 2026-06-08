import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, getCurrentWorkspaceId } from "@/server/auth/session";
import type { PermissionAction } from "@/lib/constants/rbac";
import { hasPermission } from "@/server/rbac/permissions";
import { ApiError } from "@/server/errors";
import { store } from "@/server/services/mock-store";
import type { RoleKey, User } from "@/types/domain";

export { ApiError };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

function getErrorStatus(error: unknown, fallbackStatus: number) {
  if (error instanceof ApiError) {
    return error.status;
  }
  if (error instanceof z.ZodError) {
    return 422;
  }
  return fallbackStatus;
}

function getErrorMessage(error: unknown, responseStatus: number) {
  if (error instanceof z.ZodError) {
    return "请求参数不符合接口要求";
  }
  if (error instanceof ApiError) {
    return error.message;
  }
  if (responseStatus >= 500) {
    return "请求处理失败";
  }
  return error instanceof Error ? error.message : "请求处理失败";
}

export function fail(error: unknown, status = 500) {
  const responseStatus = getErrorStatus(error, status);
  const message = getErrorMessage(error, responseStatus);
  return NextResponse.json({ error: message }, { status: responseStatus });
}

export async function readJson<TSchema extends z.ZodTypeAny>(request: NextRequest, schema: TSchema) {
  const body = await request.json().catch(() => ({}));
  return schema.parse(body) as z.infer<TSchema>;
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    currentWorkspaceId: user.currentWorkspaceId,
    role: user.role
  };
}

export function getWorkspaceRole(user: User, workspaceId: string): RoleKey | null {
  const membership = store.teamMembers.find(
    (member) => member.workspaceId === workspaceId && member.email === user.email
  );
  if (membership) {
    return membership.role;
  }
  return user.currentWorkspaceId === workspaceId ? user.role : null;
}

function inferPermission(request: NextRequest): PermissionAction | undefined {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (pathname.startsWith("/api/audit-logs")) {
    return "audit.read";
  }
  if (pathname.startsWith("/api/agent-runs")) {
    return method === "GET" ? "audit.read" : "agent.run";
  }
  if (pathname.startsWith("/api/analytics")) {
    if (pathname.endsWith("/recommendations/to-topics")) {
      return "topic.write";
    }
    return "analytics.read";
  }
  if (pathname.startsWith("/api/settings/api-keys") || pathname.startsWith("/api/settings/webhooks")) {
    return "api_key.manage";
  }
  if (pathname.startsWith("/api/settings")) {
    return "workspace.manage";
  }
  if (pathname.startsWith("/api/data-sources")) {
    return "data_source.manage";
  }
  if (pathname.startsWith("/api/brand-profiles")) {
    return method === "GET" ? "hotspot.read" : "persona.edit";
  }
  if (pathname.startsWith("/api/hotspots")) {
    return method === "GET" ? "hotspot.read" : "agent.run";
  }
  if (pathname.startsWith("/api/topics")) {
    return method === "GET" ? "hotspot.read" : "topic.write";
  }
  if (pathname.startsWith("/api/personas")) {
    return method === "GET" ? "hotspot.read" : "persona.edit";
  }
  if (pathname.startsWith("/api/contents")) {
    return pathname.endsWith("/schedule") ? "content.publish" : method === "GET" ? "hotspot.read" : "content.write";
  }
  if (pathname.startsWith("/api/calendar")) {
    return method === "GET" ? "hotspot.read" : "content.publish";
  }
  if (pathname.includes("/members")) {
    return method === "GET" ? undefined : "member.manage";
  }
  if (pathname.startsWith("/api/workspaces")) {
    return method === "GET" ? undefined : "workspace.manage";
  }

  return undefined;
}

export function getRequestContext(
  request: NextRequest,
  options: { permission?: PermissionAction; workspaceId?: string } = {}
) {
  const user = getCurrentUser();
  const workspaceId = options.workspaceId ?? getCurrentWorkspaceId(request.nextUrl.searchParams.get("workspaceId"));
  const role = getWorkspaceRole(user, workspaceId);
  const permission = options.permission ?? inferPermission(request);

  if (!role) {
    throw new ApiError("无权访问该 workspace", 403);
  }

  if (permission && !hasPermission(role, permission)) {
    throw new ApiError(`角色 ${role} 缺少权限 ${permission}`, 403);
  }

  return { user, workspaceId, role };
}

export function withApiHandler<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response> | Response
) {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      return fail(error);
    }
  };
}
