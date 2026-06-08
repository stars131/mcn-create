import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/errors";
import { listHotspots } from "@/server/services/hotspot-service";
import { store } from "@/server/services/mock-store";
import {
  createWorkspace,
  inviteMember,
  listWorkspaces,
  switchWorkspace,
  updateMemberRole
} from "@/server/services/workspace-service";

describe("workspace isolation", () => {
  it("does not mix hotspot data between workspaces", () => {
    const demo = listHotspots({ workspaceId: "ws_demo" });
    const brand = listHotspots({ workspaceId: "ws_brand" });

    expect(demo.every((item) => item.workspaceId === "ws_demo")).toBe(true);
    expect(brand.every((item) => item.workspaceId === "ws_brand")).toBe(true);
  });

  it("switches only to accessible workspaces and writes an audit log", () => {
    const owner = store.users.find((user) => user.id === "user_owner");
    const originalWorkspaceId = owner?.currentWorkspaceId;
    const beforeAudits = store.auditLogs.length;

    try {
      expect(listWorkspaces("owner@contentos.local").map((workspace) => workspace.id)).toEqual([
        "ws_demo",
        "ws_brand"
      ]);
      expect(listWorkspaces("analyst@contentos.local").map((workspace) => workspace.id)).toEqual(["ws_demo"]);

      const switched = switchWorkspace({ userId: "user_owner", workspaceId: "ws_brand" });
      expect(switched.workspace.id).toBe("ws_brand");
      expect(switched.user.currentWorkspaceId).toBe("ws_brand");
      expect(store.auditLogs.length).toBe(beforeAudits + 1);
      expect(store.auditLogs[0]).toMatchObject({
        action: "workspace.switch",
        entityId: "ws_brand"
      });

      expect(() => switchWorkspace({ userId: "user_analyst", workspaceId: "ws_brand" })).toThrow(
        "无权切换到该 workspace"
      );
    } finally {
      if (owner && originalWorkspaceId) {
        owner.currentWorkspaceId = originalWorkspaceId;
      }
    }
  });

  it("creates workspaces with owner membership and unique slugs", () => {
    const owner = store.users.find((user) => user.id === "user_owner");
    const originalWorkspaceId = owner?.currentWorkspaceId;
    const createdWorkspaceIds: string[] = [];

    try {
      const first = createWorkspace({ userId: "user_owner", name: " Client Space " });
      const second = createWorkspace({ userId: "user_owner", name: "Client Space" });
      createdWorkspaceIds.push(first.id, second.id);

      expect(first).toMatchObject({
        name: "Client Space",
        slug: "client-space"
      });
      expect(second.slug).toBe("client-space-2");
      expect(store.teamMembers).toContainEqual(
        expect.objectContaining({
          workspaceId: first.id,
          email: "owner@contentos.local",
          role: "OWNER"
        })
      );
      expect(owner?.currentWorkspaceId).toBe(second.id);
      expect(store.auditLogs[0]).toMatchObject({
        action: "workspace.create",
        entityId: second.id
      });
    } finally {
      store.workspaces = store.workspaces.filter((workspace) => !createdWorkspaceIds.includes(workspace.id));
      store.teamMembers = store.teamMembers.filter((member) => !createdWorkspaceIds.includes(member.workspaceId));
      store.auditLogs = store.auditLogs.filter((log) => !createdWorkspaceIds.includes(log.entityId ?? ""));
      if (owner && originalWorkspaceId) {
        owner.currentWorkspaceId = originalWorkspaceId;
      }
    }
  });

  it("normalizes member invites and rejects duplicate workspace memberships", () => {
    const email = `Invite-${crypto.randomUUID()}@contentos.local`;
    const createdMemberIds: string[] = [];
    const beforeInvitationIds = new Set(store.invitations.map((invitation) => invitation.id));
    const beforeNotificationIds = new Set(store.notifications.map((notification) => notification.id));

    try {
      const member = inviteMember({
        workspaceId: "ws_demo",
        userId: "user_owner",
        email,
        role: "VIEWER",
        title: "测试成员"
      });
      createdMemberIds.push(member.id);

      expect(member).toMatchObject({
        workspaceId: "ws_demo",
        email: email.toLowerCase(),
        role: "VIEWER"
      });
      const invitation = store.invitations.find((item) => !beforeInvitationIds.has(item.id));
      const notification = store.notifications.find((item) => !beforeNotificationIds.has(item.id));
      expect(invitation).toMatchObject({
        workspaceId: "ws_demo",
        email: email.toLowerCase(),
        roleKey: "VIEWER",
        invitedById: "user_owner",
        status: "ACCEPTED"
      });
      expect(notification).toMatchObject({
        workspaceId: "ws_demo",
        title: "新成员已加入 workspace"
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "member.invite",
        metadata: {
          invitationId: invitation?.id,
          notificationId: notification?.id,
          invitationStatus: "ACCEPTED"
        }
      });
      expect(() =>
        inviteMember({
          workspaceId: "ws_demo",
          userId: "user_owner",
          email: email.toUpperCase(),
          role: "EDITOR"
        })
      ).toThrow(ApiError);
      expect(store.teamMembers.filter((item) => item.email === email.toLowerCase())).toHaveLength(1);
    } finally {
      store.teamMembers = store.teamMembers.filter((member) => !createdMemberIds.includes(member.id));
      store.invitations = store.invitations.filter((invitation) => beforeInvitationIds.has(invitation.id));
      store.notifications = store.notifications.filter((notification) => beforeNotificationIds.has(notification.id));
      store.auditLogs = store.auditLogs.filter((log) => !createdMemberIds.includes(log.entityId ?? ""));
    }
  });

  it("prevents removing the last owner from a workspace", () => {
    const ownerMember = store.teamMembers.find(
      (member) => member.workspaceId === "ws_demo" && member.email === "owner@contentos.local"
    );
    expect(ownerMember).toBeTruthy();

    const beforeAudits = store.auditLogs.length;
    expect(() =>
      updateMemberRole({
        workspaceId: "ws_demo",
        memberId: ownerMember!.id,
        role: "ADMIN",
        userId: "user_owner"
      })
    ).toThrow("至少保留一个 OWNER");

    expect(ownerMember?.role).toBe("OWNER");
    expect(store.auditLogs.length).toBe(beforeAudits);
  });
});
