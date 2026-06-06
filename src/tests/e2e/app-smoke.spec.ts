import { expect, test } from "@playwright/test";

test("opens the dashboard and serves core mock workflow data", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "内容运营驾驶舱" })).toBeVisible();
  await expect(page.getByText("今日热点数量")).toBeVisible();

  await page.goto("/hotspots");
  await expect(page.getByRole("heading", { name: "热点中心" })).toBeVisible();
  await expect(page.getByRole("button", { name: "刷新热点" })).toBeVisible();

  const hotspots = await request.get("/api/hotspots");
  expect(hotspots.ok()).toBeTruthy();
  const hotspotPayload = await hotspots.json();
  expect(hotspotPayload.data.length).toBeGreaterThan(0);

  const agentRuns = await request.get("/api/agent-runs");
  expect(agentRuns.ok()).toBeTruthy();
});
