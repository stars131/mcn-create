import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, fail, withApiHandler } from "@/app/api/_utils";

describe("API utilities", () => {
  it("preserves explicit ApiError statuses and messages", async () => {
    const response = fail(new ApiError("选题不存在", 404));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "选题不存在" });
  });

  it("maps Zod validation errors to 422 without leaking schema details", async () => {
    const result = z.object({ title: z.string().min(1) }).safeParse({});
    expect(result.success).toBe(false);

    const response = fail(result.success ? null : result.error);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: "请求参数不符合接口要求" });
  });

  it("sanitizes unexpected errors as server failures by default", async () => {
    const response = fail(new Error("internal secret detail"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "请求处理失败" });
  });

  it("lets route handlers keep explicit non-500 fallback statuses", async () => {
    const response = fail(new Error("custom bad request"), 400);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "custom bad request" });
  });

  it("normalizes unexpected handler exceptions through withApiHandler", async () => {
    const handler = withApiHandler(async () => {
      throw new Error("handler implementation detail");
    });

    const response = await handler();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "请求处理失败" });
  });
});
