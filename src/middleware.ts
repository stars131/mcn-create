import { NextResponse, type NextRequest } from "next/server";
import { rolePermissions, type PermissionAction } from "@/lib/constants/rbac";
import { defaultWorkspace, store } from "@/server/services/mock-store";
import type { RoleKey } from "@/types/domain";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type ContentOsMiddlewareGlobal = typeof globalThis & {
  __contentOsRateLimit?: Map<string, RateLimitBucket>;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 240;
const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const WORKSPACE_COOKIE_NAME = process.env.WORKSPACE_COOKIE_NAME ?? "contentos_workspace";

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "local";
  return `${ip}:${request.nextUrl.pathname}`;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "0");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

function getMockUserId(request: NextRequest) {
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "contentos_session";
  const session = request.cookies.get(cookieName)?.value;
  return session?.startsWith("mock:") ? session.slice("mock:".length) : "user_owner";
}

function getWorkspaceRole(userId: string, workspaceId: string): RoleKey | null {
  const user = store.users.find((item) => item.id === userId);
  if (!user) {
    return null;
  }

  const membership = store.teamMembers.find((member) => member.workspaceId === workspaceId && member.email === user.email);
  if (membership) {
    return membership.role;
  }

  return user.currentWorkspaceId === workspaceId ? user.role : null;
}

function canAccessWorkspace(userId: string, workspaceId: string) {
  return getWorkspaceRole(userId, workspaceId) !== null;
}

function inferPermission(request: NextRequest): PermissionAction | null {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (pathname.startsWith("/api/auth") || pathname === "/api/me") {
    return null;
  }
  if (pathname.startsWith("/api/audit-logs")) {
    return "audit.read";
  }
  if (pathname.startsWith("/api/agent-runs")) {
    return method === "GET" ? "audit.read" : "agent.run";
  }
  if (pathname.startsWith("/api/analytics")) {
    return pathname.endsWith("/recommendations/to-topics") ? "topic.write" : "analytics.read";
  }
  if (pathname.startsWith("/api/data-sources")) {
    return "data_source.manage";
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
    return method === "GET" ? null : "member.manage";
  }
  if (pathname.startsWith("/api/workspaces")) {
    return method === "GET" ? null : "workspace.manage";
  }

  return null;
}

function authorizeApiRequest(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (!pathname.startsWith("/api/") || pathname.startsWith("/api/auth")) {
    return null;
  }
  if (pathname === "/api/workspaces/switch") {
    return null;
  }

  const userId = getMockUserId(request);
  const user = store.users.find((item) => item.id === userId);
  const workspacePathMatch = pathname.match(/^\/api\/workspaces\/([^/]+)/);
  const explicitWorkspaceId = workspacePathMatch?.[1] ?? searchParams.get("workspaceId");
  const cookieWorkspaceId = request.cookies.get(WORKSPACE_COOKIE_NAME)?.value;
  const fallbackWorkspaceId =
    cookieWorkspaceId && canAccessWorkspace(userId, cookieWorkspaceId)
      ? cookieWorkspaceId
      : user?.currentWorkspaceId ?? defaultWorkspace.id;
  const workspaceId = explicitWorkspaceId ?? fallbackWorkspaceId;
  const role = getWorkspaceRole(userId, workspaceId);
  if (!role) {
    return applySecurityHeaders(NextResponse.json({ error: "无权访问该 workspace" }, { status: 403 }));
  }

  const permission = inferPermission(request);
  if (permission && !rolePermissions[role].includes(permission)) {
    return applySecurityHeaders(NextResponse.json({ error: `角色 ${role} 缺少权限 ${permission}` }, { status: 403 }));
  }

  return null;
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }
  if (origin === request.nextUrl.origin) {
    return true;
  }

  const host = request.headers.get("host");
  if (!host) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const requestHost = host.toLowerCase();
    const originHost = originUrl.host.toLowerCase();
    if (originHost === requestHost) {
      return true;
    }

    const requestPort = requestHost.split(":")[1] ?? "";
    const originPort = originHost.split(":")[1] ?? "";
    const requestName = requestHost.split(":")[0];
    const originName = originHost.split(":")[0];
    const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
    return requestPort === originPort && loopbackHosts.has(requestName) && loopbackHosts.has(originName);
  } catch {
    return false;
  }
}

function rateLimit(request: NextRequest) {
  const globalStore = globalThis as ContentOsMiddlewareGlobal;
  const buckets = globalStore.__contentOsRateLimit ?? (globalStore.__contentOsRateLimit = new Map());
  const now = Date.now();
  const key = getClientKey(request);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  current.count += 1;
  if (current.count <= MAX_REQUESTS) {
    return null;
  }

  const response = NextResponse.json(
    { error: "请求过于频繁，请稍后再试" },
    {
      status: 429,
      headers: {
        "Retry-After": Math.ceil((current.resetAt - now) / 1000).toString()
      }
    }
  );
  return applySecurityHeaders(response);
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const limited = rateLimit(request);
    if (limited) {
      return limited;
    }

    if (MUTATING_METHODS.has(request.method) && !isSameOrigin(request)) {
      return applySecurityHeaders(NextResponse.json({ error: "跨站请求被拒绝" }, { status: 403 }));
    }

    const denied = authorizeApiRequest(request);
    if (denied) {
      return denied;
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
