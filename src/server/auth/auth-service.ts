import { compareSync, hashSync } from "bcryptjs";
import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import { defaultWorkspace, nextId, store } from "@/server/services/mock-store";
import type { TeamMember, User } from "@/types/domain";

interface AuthCredential {
  userId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

type ContentOsAuthGlobal = typeof globalThis & {
  __contentOsAuthCredentials?: Map<string, AuthCredential>;
};

const defaultMockPassword = process.env.MOCK_AUTH_PASSWORD ?? "contentos123";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCredentials() {
  const globalStore = globalThis as ContentOsAuthGlobal;
  const credentials = globalStore.__contentOsAuthCredentials ?? new Map<string, AuthCredential>();
  const now = new Date().toISOString();

  store.users.forEach((user) => {
    const email = normalizeEmail(user.email);
    if (!credentials.has(email)) {
      credentials.set(email, {
        userId: user.id,
        email,
        passwordHash: hashSync(defaultMockPassword, 10),
        createdAt: now,
        updatedAt: now
      });
    }
  });

  globalStore.__contentOsAuthCredentials = credentials;
  return credentials;
}

export function registerUser(input: { email: string; password: string; name: string }) {
  const email = normalizeEmail(input.email);
  const existing = store.users.find((user) => normalizeEmail(user.email) === email);
  if (existing) {
    throw new ApiError("邮箱已注册", 409);
  }

  const user: User = {
    id: nextId("user"),
    email,
    name: input.name,
    currentWorkspaceId: defaultWorkspace.id,
    role: "VIEWER"
  };
  const member: TeamMember = {
    id: nextId("member"),
    workspaceId: defaultWorkspace.id,
    name: user.name,
    email: user.email,
    role: "VIEWER",
    title: "注册成员",
    joinedAt: new Date().toISOString()
  };

  store.users.push(user);
  store.teamMembers.push(member);
  getCredentials().set(email, {
    userId: user.id,
    email,
    passwordHash: hashSync(input.password, 10),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  writeAuditLog({
    workspaceId: defaultWorkspace.id,
    userId: user.id,
    action: "auth.register",
    entityType: "User",
    entityId: user.id,
    summary: `注册用户：${user.email}`,
    metadata: { membershipId: member.id, role: member.role }
  });

  return { user, workspaceId: defaultWorkspace.id };
}

export function loginUser(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const user = store.users.find((item) => normalizeEmail(item.email) === email);
  const credential = getCredentials().get(email);

  if (!user || !credential || !compareSync(input.password, credential.passwordHash)) {
    writeAuditLog({
      action: "auth.login.failed",
      entityType: "User",
      summary: `登录失败：${email}`,
      metadata: { reason: "invalid_credentials" }
    });
    throw new ApiError("邮箱或密码不正确", 401);
  }

  writeAuditLog({
    workspaceId: user.currentWorkspaceId,
    userId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    summary: `用户登录：${user.email}`
  });

  return { user, workspaceId: user.currentWorkspaceId };
}
