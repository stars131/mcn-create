import { describe, expect, it } from "vitest";
import { getAnalyticsOverview } from "@/server/services/analytics-service";
import {
  listAccountMetricDaily,
  listPostMetricDaily,
  listPublishedPosts
} from "@/server/services/publishing-service";

describe("publishing metrics runtime", () => {
  it("lists seeded published posts and daily metrics as analytics runtime data", () => {
    const publishedPosts = listPublishedPosts("ws_demo");
    const postMetrics = listPostMetricDaily("ws_demo");
    const accountMetrics = listAccountMetricDaily("ws_demo");
    const overview = getAnalyticsOverview("ws_demo");

    expect(publishedPosts[0]).toMatchObject({
      id: "published_post_001",
      contentDraftId: "content_001",
      platform: "XIAOHONGSHU"
    });
    expect(postMetrics.map((metric) => metric.publishedPostId)).toContain("published_post_001");
    expect(accountMetrics.map((metric) => metric.platformAccountId)).toEqual(
      expect.arrayContaining(["platform_account_001", "platform_account_002"])
    );
    expect(overview.publishedPosts).toHaveLength(publishedPosts.length);
    expect(overview.postDailyMetrics).toHaveLength(postMetrics.length);
    expect(overview.accountDailyMetrics).toHaveLength(accountMetrics.length);
    expect(overview.publishedTotals.views).toBeGreaterThan(0);
    expect(overview.totals.views).toBeGreaterThan(overview.importedTotals.views);
  });
});
