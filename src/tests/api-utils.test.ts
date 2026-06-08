import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { ApiError, fail, withApiHandler } from "@/app/api/_utils";
import { listErrorLogs } from "@/server/observability/error-log-service";
import { store } from "@/server/services/mock-store";

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
    const beforeErrorLogs = store.errorLogs.length;
    const handler = withApiHandler(async () => {
      throw new Error("handler implementation detail");
    });

    try {
      const response = await handler();

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: "请求处理失败" });
      expect(store.errorLogs.length).toBe(beforeErrorLogs + 1);
      expect(store.errorLogs[0]).toMatchObject({
        route: "unknown",
        method: "UNKNOWN",
        status: 500,
        publicMessage: "请求处理失败",
        errorName: "Error",
        errorMessage: "handler implementation detail",
        metadata: { handler: "withApiHandler" }
      });
    } finally {
      store.errorLogs.splice(0, store.errorLogs.length - beforeErrorLogs);
    }
  });

  it("records request metadata for handled API errors", async () => {
    const beforeErrorLogs = store.errorLogs.length;
    const request = {
      method: "POST",
      nextUrl: new URL("https://contentos.local/api/topics?workspaceId=ws_demo"),
      headers: new Headers({
        "x-request-id": "req_test_001",
        cookie: "contentos_session=mock:user_owner"
      })
    } as unknown as NextRequest;
    const handler = withApiHandler(async (_request: NextRequest) => {
      throw new ApiError("选题不存在", 404);
    });

    try {
      const response = await handler(request);

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "选题不存在" });
      expect(listErrorLogs("ws_demo")[0]).toMatchObject({
        requestId: "req_test_001",
        workspaceId: "ws_demo",
        userId: "user_owner",
        route: "/api/topics?workspaceId=ws_demo",
        method: "POST",
        status: 404,
        publicMessage: "选题不存在",
        errorName: "Error",
        errorMessage: "选题不存在"
      });
    } finally {
      store.errorLogs.splice(0, store.errorLogs.length - beforeErrorLogs);
    }
  });
});
