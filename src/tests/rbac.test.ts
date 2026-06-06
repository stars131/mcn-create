import { describe, expect, it } from "vitest";
import { hasPermission } from "@/server/rbac/permissions";

describe("RBAC", () => {
  it("allows owner to manage api keys", () => {
    expect(hasPermission("OWNER", "api_key.manage")).toBe(true);
  });

  it("prevents analyst from publishing content", () => {
    expect(hasPermission("ANALYST", "content.publish")).toBe(false);
  });

  it("allows editor to generate content", () => {
    expect(hasPermission("EDITOR", "content.write")).toBe(true);
  });
});
