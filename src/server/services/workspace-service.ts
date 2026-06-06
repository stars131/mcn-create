import { writeAuditLog } from "@/server/audit/audit-service";
import { defaultWorkspace, nextId, store } from "@/server/services/mock-store";
import type { RoleKey, TeamMember, Workspace } from "@/types/domain";

export function listWorkspaces() {
  return store.workspaces;
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
