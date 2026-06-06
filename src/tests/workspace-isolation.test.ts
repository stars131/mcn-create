import { describe, expect, it } from "vitest";
import { listHotspots } from "@/server/services/hotspot-service";
import { store } from "@/server/services/mock-store";
import { listWorkspaces, switchWorkspace } from "@/server/services/workspace-service";

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
});
