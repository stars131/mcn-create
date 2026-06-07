import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/errors";
import { loginUser, registerUser } from "@/server/auth/auth-service";
import { defaultWorkspace, store } from "@/server/services/mock-store";

describe("auth service", () => {
  it("registers users into the default workspace and writes audit logs", () => {
    const email = `registered-${crypto.randomUUID()}@contentos.local`;
    let userId: string | undefined;

    try {
      const result = registerUser({
        email: email.toUpperCase(),
        password: "contentos123",
        name: "注册测试成员"
      });
      userId = result.user.id;

      expect(result.workspaceId).toBe(defaultWorkspace.id);
      expect(result.user.email).toBe(email);
      expect(store.teamMembers).toContainEqual(
        expect.objectContaining({
          workspaceId: defaultWorkspace.id,
          email,
          role: "VIEWER"
        })
      );
      expect(store.auditLogs[0]).toMatchObject({
        action: "auth.register",
        entityType: "User",
        entityId: result.user.id
      });

      const login = loginUser({ email, password: "contentos123" });
      expect(login.user.id).toBe(result.user.id);
      expect(store.auditLogs[0]).toMatchObject({
        action: "auth.login",
        entityType: "User",
        entityId: result.user.id
      });
    } finally {
      if (userId) {
        store.users = store.users.filter((user) => user.id !== userId);
        store.teamMembers = store.teamMembers.filter((member) => member.email !== email);
      }
      store.auditLogs = store.auditLogs.filter((log) => !log.summary.includes(email) && log.entityId !== userId);
    }
  });

  it("rejects duplicate registrations", () => {
    expect(() =>
      registerUser({
        email: "owner@contentos.local",
        password: "contentos123",
        name: "重复账号"
      })
    ).toThrow(ApiError);
  });

  it("rejects invalid login instead of falling back to the default user", () => {
    const email = `missing-${crypto.randomUUID()}@contentos.local`;
    const beforeAudits = store.auditLogs.length;

    try {
      expect(() => loginUser({ email, password: "contentos123" })).toThrow("邮箱或密码不正确");
      expect(store.auditLogs.length).toBe(beforeAudits + 1);
      expect(store.auditLogs[0]).toMatchObject({
        action: "auth.login.failed",
        entityType: "User",
        metadata: { reason: "invalid_credentials" }
      });
      expect(store.auditLogs[0].summary).toContain(email);
    } finally {
      store.auditLogs = store.auditLogs.filter((log) => !log.summary.includes(email));
    }
  });
});
