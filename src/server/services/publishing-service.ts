import { getWorkspaceScoped, nextId, store } from "@/server/services/mock-store";
import type { AccountMetricDaily, CalendarItem, Platform, PostMetricDaily, PublishedPost } from "@/types/domain";

function metricDate(value: string) {
  return value.slice(0, 10);
}

function findPlatformAccount(workspaceId: string, platform: Platform) {
  return store.platformAccounts.find((account) => account.workspaceId === workspaceId && account.platform === platform);
}

function basePostMetrics(platform: Platform, contentLength: number) {
  const platformMultiplier =
    platform === "DOUYIN" ? 1.55 : platform === "XIAOHONGSHU" ? 1.25 : platform === "WECHAT" ? 1.05 : 1;
  const views = Math.max(800, Math.round((contentLength + 900) * platformMultiplier));
  const likes = Math.round(views * 0.052);
  const comments = Math.round(views * 0.008);
  const shares = Math.round(views * 0.012);
  const conversions = Math.round(views * 0.0025);

  return { views, likes, comments, shares, conversions };
}

export function listPublishedPosts(workspaceId: string) {
  return getWorkspaceScoped(store.publishedPosts, workspaceId).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function listPostMetricDaily(workspaceId: string) {
  return getWorkspaceScoped(store.postMetricDaily, workspaceId).sort(
    (a, b) => new Date(b.metricDate).getTime() - new Date(a.metricDate).getTime()
  );
}

export function listAccountMetricDaily(workspaceId: string) {
  return getWorkspaceScoped(store.accountMetricDaily, workspaceId).sort(
    (a, b) => new Date(b.metricDate).getTime() - new Date(a.metricDate).getTime()
  );
}

export function createPublishedPostFromCalendarItem(item: CalendarItem) {
  if (!item.contentDraftId) {
    return undefined;
  }

  const content = store.contentDrafts.find(
    (draft) => draft.workspaceId === item.workspaceId && draft.id === item.contentDraftId
  );
  if (!content) {
    return undefined;
  }

  const existing = store.publishedPosts.find(
    (post) =>
      post.workspaceId === item.workspaceId &&
      post.contentDraftId === item.contentDraftId &&
      post.platform === item.platform &&
      metricDate(post.publishedAt) === metricDate(item.scheduledAt)
  );
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const publishPlan = store.publishPlans.find(
    (plan) =>
      plan.workspaceId === item.workspaceId &&
      plan.contentDraftId === item.contentDraftId &&
      plan.platform === item.platform &&
      metricDate(plan.scheduledAt) === metricDate(item.scheduledAt)
  );
  const metrics = basePostMetrics(item.platform, content.content.length);
  const publishedPost: PublishedPost = {
    id: nextId("published_post"),
    workspaceId: item.workspaceId,
    publishPlanId: publishPlan?.id,
    contentDraftId: content.id,
    platform: item.platform,
    platformPostId: `${item.platform.toLowerCase()}_${nextId("post").replace("post_", "")}`,
    url: `mock://${item.platform.toLowerCase()}/posts/${content.id}`,
    publishedAt: item.scheduledAt,
    metrics,
    createdAt: now,
    updatedAt: now
  };
  const postMetric: PostMetricDaily = {
    id: nextId("post_metric_daily"),
    workspaceId: item.workspaceId,
    publishedPostId: publishedPost.id,
    platform: item.platform,
    metricDate: item.scheduledAt,
    ...metrics,
    createdAt: now,
    updatedAt: now
  };
  const account = findPlatformAccount(item.workspaceId, item.platform);
  const accountMetric: AccountMetricDaily = {
    id: nextId("account_metric_daily"),
    workspaceId: item.workspaceId,
    platformAccountId: account?.id,
    platform: item.platform,
    metricDate: item.scheduledAt,
    followers: Math.max(1000, Math.round(metrics.views * 0.48)),
    impressions: metrics.views,
    engagementRate: Number((((metrics.likes + metrics.comments + metrics.shares) / metrics.views) * 100).toFixed(2)),
    createdAt: now,
    updatedAt: now
  };

  content.status = "PUBLISHED";
  content.updatedAt = now;
  if (publishPlan) {
    publishPlan.status = "PUBLISHED";
    publishPlan.exportUrl = publishedPost.url;
    publishPlan.updatedAt = now;
  }
  store.publishedPosts.unshift(publishedPost);
  store.postMetricDaily.unshift(postMetric);
  store.accountMetricDaily.unshift(accountMetric);

  return publishedPost;
}
