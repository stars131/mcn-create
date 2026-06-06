import { describe, expect, it } from "vitest";
import {
  createCalendarItem,
  listCalendarItems,
  updateCalendarItem
} from "@/server/services/calendar-service";
import { store } from "@/server/services/mock-store";

describe("calendar service", () => {
  it("scopes calendar reads to the active workspace", () => {
    const createdIds: string[] = [];

    try {
      const demoItem = createCalendarItem({
        workspaceId: "ws_demo",
        userId: "user_owner",
        title: "Demo workspace calendar item",
        platform: "WECHAT",
        scheduledAt: "2026-06-10T10:00:00.000Z",
        ownerName: "林澈"
      });
      const brandItem = createCalendarItem({
        workspaceId: "ws_brand",
        userId: "user_owner",
        title: "Brand workspace calendar item",
        platform: "DOUYIN",
        scheduledAt: "2026-06-11T10:00:00.000Z",
        ownerName: "林澈"
      });
      createdIds.push(demoItem.id, brandItem.id);

      const demoItems = listCalendarItems("ws_demo");
      const brandItems = listCalendarItems("ws_brand");

      expect(demoItems.some((item) => item.id === demoItem.id)).toBe(true);
      expect(demoItems.some((item) => item.id === brandItem.id)).toBe(false);
      expect(brandItems).toEqual([brandItem]);
    } finally {
      store.calendarItems = store.calendarItems.filter((item) => !createdIds.includes(item.id));
      store.auditLogs = store.auditLogs.filter((log) => !createdIds.includes(log.entityId ?? ""));
    }
  });

  it("writes audit logs for direct calendar item create and update", () => {
    const beforeAudits = store.auditLogs.length;
    let createdId: string | undefined;

    try {
      const item = createCalendarItem({
        workspaceId: "ws_demo",
        userId: "user_owner",
        title: "Audited calendar item",
        platform: "XIAOHONGSHU",
        scheduledAt: "2026-06-12T10:00:00.000Z",
        ownerName: "周安"
      });
      createdId = item.id;

      const updated = updateCalendarItem({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: item.id,
        patch: { status: "READY", scheduledAt: "2026-06-13T10:00:00.000Z" }
      });

      expect(updated).toMatchObject({
        id: item.id,
        status: "READY",
        scheduledAt: "2026-06-13T10:00:00.000Z"
      });
      expect(store.auditLogs.length).toBe(beforeAudits + 2);
      expect(store.auditLogs[1]).toMatchObject({
        action: "calendar_item.create",
        entityType: "CalendarItem",
        entityId: item.id
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "calendar_item.update",
        entityType: "CalendarItem",
        entityId: item.id,
        metadata: { status: "READY", scheduledAt: "2026-06-13T10:00:00.000Z" }
      });
    } finally {
      if (createdId) {
        store.calendarItems = store.calendarItems.filter((item) => item.id !== createdId);
        store.auditLogs = store.auditLogs.filter((log) => log.entityId !== createdId);
      }
    }
  });

  it("rejects updates outside the requested workspace", () => {
    const item = createCalendarItem({
      workspaceId: "ws_demo",
      userId: "user_owner",
      title: "Workspace protected calendar item",
      platform: "WECHAT",
      scheduledAt: "2026-06-14T10:00:00.000Z",
      ownerName: "林澈"
    });

    try {
      expect(() =>
        updateCalendarItem({
          workspaceId: "ws_brand",
          userId: "user_owner",
          id: item.id,
          patch: { status: "PUBLISHED" }
        })
      ).toThrow("日历项不存在");
    } finally {
      store.calendarItems = store.calendarItems.filter((record) => record.id !== item.id);
      store.auditLogs = store.auditLogs.filter((log) => log.entityId !== item.id);
    }
  });
});
