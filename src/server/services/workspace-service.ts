import { writeAuditLog } from "@/server/audit/audit-service";
import { defaultWorkspace, nextId, store } from "@/server/services/mock-store";
import type { RoleKey, TeamMember, Workspace } from "@/types/domain";

export function listWorkspaces(userEmail?: string) {
  if (!userEmail) {
    return store.workspaces;
  }

  const user = store.users.find((item) => item.email === userEmail);
  const workspaceIds = new Set(
    store.teamMembers.filter((member) => member.email === userEmail).map((member) => member.workspaceId)
  );
  if (user) {
    workspaceIds.add(user.currentWorkspaceId);
  }

  return store.workspaces.filter((workspace) => workspaceIds.has(workspace.id));
}

export function createWorkspace(input: { name: string; organizationName?: string; userId: string }) {
  const workspace: Workspace = {
    id: nextId("ws"),
    name: input.name,
    slug: input.name.toLowerCase().replace(/\s+/g, "-"),
    organizationName: input.organizationName ?? defaultWorkspace.organizationName,
    currentPlan: "MVP Team"
  };
  store.workspaces.push(workspace);
  const owner = store.users.find((user) => user.id === input.userId);
  if (owner) {
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
  }
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
  const user = store.users.find((item) => item.id === input.userId);
  if (!user) {
    throw new Error("用户不存在");
  }

  const workspace = store.workspaces.find((item) => item.id === input.workspaceId);
  if (!workspace) {
    throw new Error("workspace 不存在");
  }

  const isMember = store.teamMembers.some(
    (member) => member.workspaceId === workspace.id && member.email === user.email
  );
  if (!isMember) {
    throw new Error("无权切换到该 workspace");
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

export function inviteMember(input: {
  workspaceId: string;
  email: string;
  role: RoleKey;
  title?: string;
  userId: string;
}) {
  const member: TeamMember = {
    id: nextId("member"),
    workspaceId: input.workspaceId,
    name: input.email.split("@")[0],
    email: input.email,
    role: input.role,
    title: input.title ?? "待确认成员",
    joinedAt: new Date().toISOString()
  };
  store.teamMembers.push(member);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "member.invite",
    entityType: "Membership",
    entityId: member.id,
    summary: `邀请成员 ${input.email} 为 ${input.role}`
  });
  return member;
}

export function updateMemberRole(input: {
  workspaceId: string;
  memberId: string;
  role: RoleKey;
  userId: string;
}) {
  const member = store.teamMembers.find(
    (item) => item.workspaceId === input.workspaceId && item.id === input.memberId
  );
  if (!member) {
    throw new Error("成员不存在");
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
