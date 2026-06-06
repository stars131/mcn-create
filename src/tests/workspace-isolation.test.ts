import { describe, expect, it } from "vitest";
import { listHotspots } from "@/server/services/hotspot-service";

describe("workspace isolation", () => {
  it("does not mix hotspot data between workspaces", () => {
    const demo = listHotspots({ workspaceId: "ws_demo" });
    const brand = listHotspots({ workspaceId: "ws_brand" });

    expect(demo.every((item) => item.workspaceId === "ws_demo")).toBe(true);
    expect(brand.every((item) => item.workspaceId === "ws_brand")).toBe(true);
  });
});
