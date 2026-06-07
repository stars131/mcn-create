import { describe, expect, it } from "vitest";
import { ApiError } from "@/server/errors";
import { parseMetricImport } from "@/server/services/analytics-service";
import { getCalendarItem } from "@/server/services/calendar-service";
import { getContent } from "@/server/services/content-service";
import { getPersona } from "@/server/services/persona-service";
import { getTopic } from "@/server/services/topic-service";

function expectApiError(action: () => unknown, status: number, message: string) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(status);
    expect((error as Error).message).toBe(message);
    return;
  }

  throw new Error("Expected ApiError");
}

describe("service API errors", () => {
  it("returns 404 semantics for missing workspace-scoped records", () => {
    expectApiError(() => getTopic("ws_demo", "missing_topic"), 404, "选题不存在");
    expectApiError(() => getPersona("ws_demo", "missing_persona"), 404, "人设不存在");
    expectApiError(() => getContent("ws_demo", "missing_content"), 404, "内容草稿不存在");
    expectApiError(() => getCalendarItem("ws_demo", "missing_calendar_item"), 404, "日历项不存在");
  });

  it("returns 422 semantics for malformed analytics imports", () => {
    expectApiError(
      () => parseMetricImport({ fileType: "CSV", rawText: "title,platform,views" }),
      422,
      "导入表格至少需要表头和一行数据"
    );
    expectApiError(
      () => parseMetricImport({ fileType: "JSON", rawText: "{bad json" }),
      422,
      "JSON 导入内容格式不正确"
    );
    expectApiError(
      () =>
        parseMetricImport({
          records: [{ title: "Bad metric", platform: "UNKNOWN", views: 1, likes: 0, comments: 0, shares: 0, conversions: 0 }]
        }),
      422,
      "导入平台不受支持：UNKNOWN"
    );
  });
});
