import { writeAuditLog } from "@/server/audit/audit-service";
import { ApiError } from "@/server/errors";
import { defaultWorkspace, nextId, store } from "@/server/services/mock-store";
import { createNotification } from "@/server/services/notification-service";
import type { Invitation, RoleKey, TeamMember, Workspace } from "@/types/domain";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getWorkspaceOrThrow(workspaceId: string) {
  const workspace = store.workspaces.find((item) => item.id === workspaceId);
  if (!workspace) {
    throw new ApiError("workspace 不存在", 404);
  }

  return workspace;
}

function getUserOrThrow(userId: string) {
  const user = store.users.find((item) => item.id === userId);
  if (!user) {
    throw new ApiError("用户不存在", 404);
  }

  return user;
}

function createUniqueSlug(name: string) {
  const baseSlug = name.trim().toLowerCase().replace(/\s+/g, "-") || "workspace";
  let slug = baseSlug;
  let suffix = 2;

  while (store.workspaces.some((workspace) => workspace.slug === slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function countWorkspaceOwners(workspaceId: string) {
  return store.teamMembers.filter((member) => member.workspaceId === workspaceId && member.role === "OWNER").length;
}

export function listWorkspaces(userEmail?: string) {
  if (!userEmail) {
    return store.workspaces;
  }

  const email = normalizeEmail(userEmail);
  const user = store.users.find((item) => normalizeEmail(item.email) === email);
  const workspaceIds = new Set(
    store.teamMembers.filter((member) => normalizeEmail(member.email) === email).map((member) => member.workspaceId)
  );
  if (user) {
    workspaceIds.add(user.currentWorkspaceId);
  }

  return store.workspaces.filter((workspace) => workspaceIds.has(workspace.id));
}

export function createWorkspace(input: { name: string; organizationName?: string; userId: string }) {
  const owner = getUserOrThrow(input.userId);
  const name = input.name.trim();
  if (!name) {
    throw new ApiError("workspace 名称不能为空", 422);
  }

  const workspace: Workspace = {
    id: nextId("ws"),
    name,
    slug: createUniqueSlug(name),
    organizationName: input.organizationName?.trim() || defaultWorkspace.organizationName,
    currentPlan: "MVP Team"
  };
  store.workspaces.push(workspace);
  store.teamMembers.push({
    id: nextId("member"),
    workspaceId: workspace.id,
    name: owner.name,
    email: owner.email,
    role: "OWNER",
    title: "Workspace Owner",
    joinedAt: new Date().toISOString()
  });
  owner.currentWorkspaceId = workspace.id;
  writeAuditLog({
    workspaceId: workspace.id,
    userId: input.userId,
    action: "workspace.create",
    entityType: "Workspace",
    entityId: workspace.id,
    summary: `创建 workspace：${workspace.name}`
  });
  return workspace;
}

export function switchWorkspace(input: { userId: string; workspaceId: string }) {
  const user = getUserOrThrow(input.userId);
  const workspace = getWorkspaceOrThrow(input.workspaceId);

  const isMember = store.teamMembers.some(
    (member) => member.workspaceId === workspace.id && member.email === user.email
  );
  if (!isMember) {
    throw new ApiError("无权切换到该 workspace", 403);
  }

  user.currentWorkspaceId = workspace.id;
  writeAuditLog({
    workspaceId: workspace.id,
    userId: user.id,
    action: "workspace.switch",
    entityType: "Workspace",
    entityId: workspace.id,
    summary: `切换 workspace：${workspace.name}`
  });

  return { user, workspace };
}

export function listMembers(workspaceId: string) {
  return store.teamMembers.filter((member) => member.workspaceId === workspaceId);
}

export function listInvitations(workspaceId: string) {
  return store.invitations
    .filter((invitation) => invitation.workspaceId === workspaceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function inviteMember(input: {
  workspaceId: string;
  email: string;
  role: RoleKey;
  title?: string;
  userId: string;
}) {
  getWorkspaceOrThrow(input.workspaceId);
  getUserOrThrow(input.userId);
  const email = normalizeEmail(input.email);
  const existing = store.teamMembers.find(
    (member) => member.workspaceId === input.workspaceId && normalizeEmail(member.email) === email
  );
  if (existing) {
    throw new ApiError("成员已在该 workspace 中", 409);
  }

  const existingUser = store.users.find((user) => normalizeEmail(user.email) === email);
  const now = new Date().toISOString();
  const invitation: Invitation = {
    id: nextId("invitation"),
    workspaceId: input.workspaceId,
    email,
    roleKey: input.role,
    token: `invite_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`,
    invitedById: input.userId,
    status: "ACCEPTED",
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    acceptedAt: now,
    createdAt: now,
    updatedAt: now
  };
  const member: TeamMember = {
    id: nextId("member"),
    workspaceId: input.workspaceId,
    name: existingUser?.name ?? email.split("@")[0],
    email,
    role: input.role,
    title: input.title ?? "待确认成员",
    joinedAt: now
  };
  store.invitations.unshift(invitation);
  store.teamMembers.push(member);
  const notification = createNotification({
    workspaceId: input.workspaceId,
    title: "新成员已加入 workspace",
    body: `${email} 已作为 ${input.role} 加入当前 workspace。`
  });
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "member.invite",
    entityType: "Membership",
    entityId: member.id,
    summary: `邀请成员 ${input.email} 为 ${input.role}`,
    metadata: {
      invitationId: invitation.id,
      notificationId: notification.id,
      invitationStatus: invitation.status
    }
  });
  return member;
}

export function updateMemberRole(input: {
  workspaceId: string;
  memberId: string;
  role: RoleKey;
  userId: string;
}) {
  getWorkspaceOrThrow(input.workspaceId);
  getUserOrThrow(input.userId);
  const member = store.teamMembers.find(
    (item) => item.workspaceId === input.workspaceId && item.id === input.memberId
  );
  if (!member) {
    throw new ApiError("成员不存在", 404);
  }

  if (member.role === "OWNER" && input.role !== "OWNER" && countWorkspaceOwners(input.workspaceId) <= 1) {
    throw new ApiError("至少保留一个 OWNER", 409);
  }

  member.role = input.role;
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "member.role.update",
    entityType: "Membership",
    entityId: member.id,
    summary: `修改成员 ${member.email} 角色为 ${input.role}`
  });
  return member;
}
