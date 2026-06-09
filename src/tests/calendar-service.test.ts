import { describe, expect, it } from "vitest";
import {
  createCalendarItem,
  listCalendarItems,
  updateCalendarItem
} from "@/server/services/calendar-service";
import { scheduleContent } from "@/server/services/content-service";
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

  it("creates published post and daily metrics when a linked calendar item is published", () => {
    const content = store.contentDrafts.find((item) => item.id === "content_001");
    expect(content).toBeTruthy();
    const originalContent = {
      ...content!,
      riskItems: [...content!.riskItems]
    };
    const beforePublishPlanIds = new Set(store.publishPlans.map((plan) => plan.id));
    const beforeCalendarIds = new Set(store.calendarItems.map((item) => item.id));
    const beforePublishedPostIds = new Set(store.publishedPosts.map((post) => post.id));
    const beforePostMetricIds = new Set(store.postMetricDaily.map((metric) => metric.id));
    const beforeAccountMetricIds = new Set(store.accountMetricDaily.map((metric) => metric.id));
    const beforeAuditLogIds = new Set(store.auditLogs.map((log) => log.id));

    try {
      const scheduledAt = "2026-07-01T09:00:00.000Z";
      const rescheduledAt = "2026-07-02T09:00:00.000Z";
      const calendarItem = scheduleContent({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: "content_001",
        platform: "XIAOHONGSHU",
        scheduledAt
      });
      const publishPlan = store.publishPlans.find((plan) => !beforePublishPlanIds.has(plan.id));

      const rescheduledItem = updateCalendarItem({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: calendarItem.id,
        patch: { scheduledAt: rescheduledAt }
      });

      expect(rescheduledItem.scheduledAt).toBe(rescheduledAt);
      expect(publishPlan).toMatchObject({
        scheduledAt: rescheduledAt
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "calendar_item.update",
        entityType: "CalendarItem",
        entityId: calendarItem.id,
        metadata: {
          scheduledAt: rescheduledAt,
          previousScheduledAt: scheduledAt,
          syncedPublishPlanId: publishPlan?.id
        }
      });

      const publishedItem = updateCalendarItem({
        workspaceId: "ws_demo",
        userId: "user_owner",
        id: calendarItem.id,
        patch: { status: "PUBLISHED" }
      });
      const publishedPost = store.publishedPosts.find((post) => !beforePublishedPostIds.has(post.id));
      const postMetric = store.postMetricDaily.find((metric) => !beforePostMetricIds.has(metric.id));
      const accountMetric = store.accountMetricDaily.find((metric) => !beforeAccountMetricIds.has(metric.id));

      expect(publishedItem.status).toBe("PUBLISHED");
      expect(content?.status).toBe("PUBLISHED");
      expect(publishPlan).toMatchObject({
        status: "PUBLISHED",
        exportUrl: publishedPost?.url
      });
      expect(publishedPost).toMatchObject({
        workspaceId: "ws_demo",
        publishPlanId: publishPlan?.id,
        contentDraftId: "content_001",
        platform: "XIAOHONGSHU",
        publishedAt: rescheduledAt
      });
      expect(postMetric).toMatchObject({
        publishedPostId: publishedPost?.id,
        platform: "XIAOHONGSHU",
        metricDate: rescheduledAt
      });
      expect(accountMetric).toMatchObject({
        platformAccountId: "platform_account_001",
        platform: "XIAOHONGSHU",
        metricDate: rescheduledAt
      });
      expect(store.auditLogs[0]).toMatchObject({
        action: "calendar_item.update",
        entityType: "CalendarItem",
        entityId: calendarItem.id,
        metadata: {
          status: "PUBLISHED",
          publishedPostId: publishedPost?.id
        }
      });
    } finally {
      Object.assign(content!, originalContent);
      store.publishPlans = store.publishPlans.filter((plan) => beforePublishPlanIds.has(plan.id));
      store.calendarItems = store.calendarItems.filter((item) => beforeCalendarIds.has(item.id));
      store.publishedPosts = store.publishedPosts.filter((post) => beforePublishedPostIds.has(post.id));
      store.postMetricDaily = store.postMetricDaily.filter((metric) => beforePostMetricIds.has(metric.id));
      store.accountMetricDaily = store.accountMetricDaily.filter((metric) => beforeAccountMetricIds.has(metric.id));
      store.auditLogs = store.auditLogs.filter((log) => beforeAuditLogIds.has(log.id));
    }
  });
});
