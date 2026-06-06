import { writeAuditLog } from "@/server/audit/audit-service";
import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { CalendarItem, Platform } from "@/types/domain";

export function listCalendarItems(workspaceId: string) {
  return getWorkspaceScoped(store.calendarItems, workspaceId).sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
}

export function getCalendarItem(workspaceId: string, id: string) {
  const item = store.calendarItems.find((record) => record.workspaceId === workspaceId && record.id === id);
  if (!item) {
    throw new Error("日历项不存在");
  }
  return item;
}

export function createCalendarItem(input: {
  workspaceId: string;
  userId: string;
  title: string;
  platform: Platform;
  scheduledAt: string;
  ownerName: string;
}) {
  const item: CalendarItem = {
    id: nextId("cal"),
    workspaceId: input.workspaceId,
    title: input.title,
    platform: input.platform,
    scheduledAt: input.scheduledAt,
    ownerName: input.ownerName,
    status: "PLANNED"
  };
  store.calendarItems.unshift(item);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "calendar_item.create",
    entityType: "CalendarItem",
    entityId: item.id,
    summary: `创建日历项：${item.title}`
  });
  return item;
}

export function updateCalendarItem(input: {
  workspaceId: string;
  userId: string;
  id: string;
  patch: Partial<Pick<CalendarItem, "scheduledAt" | "status">>;
}) {
  const item = getCalendarItem(input.workspaceId, input.id);
  Object.assign(item, input.patch);
  writeAuditLog({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: "calendar_item.update",
    entityType: "CalendarItem",
    entityId: item.id,
    summary: `更新日历项：${item.title}`,
    metadata: input.patch
  });
  return item;
}
