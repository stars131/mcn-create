import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { Notification } from "@/types/domain";

export function listNotifications(workspaceId: string, userId?: string) {
  return getWorkspaceScoped(store.notifications, workspaceId)
    .filter((notification) => (notification.userId && userId ? notification.userId === userId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createNotification(input: {
  workspaceId: string;
  userId?: string;
  title: string;
  body: string;
}) {
  const now = new Date().toISOString();
  const notification: Notification = {
    id: nextId("notification"),
    workspaceId: input.workspaceId,
    userId: input.userId,
    title: input.title,
    body: input.body,
    createdAt: now,
    updatedAt: now
  };
  store.notifications.unshift(notification);
  return notification;
}

export function markNotificationRead(workspaceId: string, id: string) {
  const notification = store.notifications.find((item) => item.workspaceId === workspaceId && item.id === id);
  if (!notification) {
    return undefined;
  }

  notification.readAt = notification.readAt ?? new Date().toISOString();
  notification.updatedAt = notification.readAt;
  return notification;
}
