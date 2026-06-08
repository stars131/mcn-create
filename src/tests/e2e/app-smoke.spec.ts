import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const ownerCookie = "contentos_session=mock:user_owner; contentos_workspace=ws_demo";

async function loginAsOwner(page: import("@playwright/test").Page, nextPath = "/dashboard") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page.getByRole("button", { name: "登录工作台" }).click();
  await expect(page).toHaveURL(new RegExp(`${nextPath}$`));
}

test("requires authentication for app pages and business APIs", async ({ page, request }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();

  const anonymousHotspots = await request.get("/api/hotspots");
  expect(anonymousHotspots.status()).toBe(401);
  await expect(anonymousHotspots.json()).resolves.toEqual({ error: "未登录" });
  expect(anonymousHotspots.headers()["x-content-type-options"]).toBe("nosniff");
  expect(anonymousHotspots.headers()["ratelimit-limit"] ?? anonymousHotspots.headers()["x-ratelimit-limit"]).toBe("240");
  expect(anonymousHotspots.headers()["ratelimit-remaining"] ?? anonymousHotspots.headers()["x-ratelimit-remaining"]).toBeDefined();
  expect(anonymousHotspots.headers()["ratelimit-reset"] ?? anonymousHotspots.headers()["x-ratelimit-reset"]).toBeDefined();
});

test("opens the dashboard and serves core mock workflow data", async ({ page, request }) => {
  test.setTimeout(60000);

  await loginAsOwner(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "内容运营驾驶舱" })).toBeVisible();
  await expect(page.getByText("今日热点数量")).toBeVisible();

  await page.goto("/hotspots");
  await expect(page.getByRole("heading", { name: "热点中心" })).toBeVisible();
  await expect(page.getByRole("button", { name: "刷新热点" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "早期信号" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "趋势快照" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "竞品账号" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "关键词监控" })).toBeVisible();

  await page.goto("/topics");
  await expect(page.getByRole("heading", { name: "选题池" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "切入角度资产" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "评分拆解" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "状态流转" })).toBeVisible();

  await page.goto("/persona");
  await expect(page.getByRole("heading", { name: "人设记忆层" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "品牌档案" })).toBeVisible();
  await expect(page.getByText("已绑定档案")).toBeVisible();
  await expect(page.getByText("中文内容运营与创作者工具")).toBeVisible();

  await page.goto("/data-sources");
  await expect(page.getByRole("heading", { name: "数据源与平台授权" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "授权账号" })).toBeVisible();

  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "数据分析" })).toBeVisible();
  await expect(page.getByRole("button", { name: "上传数据文件" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "发布作品日指标" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "账号日指标" })).toBeVisible();

  await page.goto("/team");
  await expect(page.getByRole("heading", { name: "团队与权限" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "邀请记录" })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "系统设置" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "通知中心" })).toBeVisible();

  const hotspots = await request.get("/api/hotspots", {
    headers: { Cookie: ownerCookie }
  });
  expect(hotspots.ok()).toBeTruthy();
  expect(hotspots.headers()["x-content-type-options"]).toBe("nosniff");
  expect(hotspots.headers()["x-frame-options"]).toBe("DENY");
  const hotspotPayload = await hotspots.json();
  expect(hotspotPayload.data.length).toBeGreaterThan(0);

  const hotspotRuntime = await request.get("/api/hotspots/runtime", {
    headers: { Cookie: ownerCookie }
  });
  expect(hotspotRuntime.ok()).toBeTruthy();
  const hotspotRuntimePayload = await hotspotRuntime.json();
  expect(hotspotRuntimePayload.data.signals.length).toBeGreaterThan(0);
  expect(hotspotRuntimePayload.data.trendSnapshots.length).toBeGreaterThan(0);
  expect(hotspotRuntimePayload.data.competitorAccounts.length).toBeGreaterThan(0);
  expect(hotspotRuntimePayload.data.keywordWatches.length).toBeGreaterThan(0);

  const topicRuntime = await request.get("/api/topics/topic_001/runtime", {
    headers: { Cookie: ownerCookie }
  });
  expect(topicRuntime.ok()).toBeTruthy();
  const topicRuntimePayload = await topicRuntime.json();
  expect(topicRuntimePayload.data.angles.length).toBeGreaterThan(0);
  expect(topicRuntimePayload.data.scores.length).toBeGreaterThan(0);
  expect(topicRuntimePayload.data.statusHistory.map((history: { toStatus: string }) => history.toStatus)).toContain(
    "ADOPTED"
  );

  const brandProfiles = await request.get("/api/brand-profiles", {
    headers: { Cookie: ownerCookie }
  });
  expect(brandProfiles.ok()).toBeTruthy();
  const brandProfilePayload = await brandProfiles.json();
  expect(brandProfilePayload.data).toContainEqual(
    expect.objectContaining({
      id: "brand_profile_001",
      workspaceId: "ws_demo",
      name: "ContentOS",
      industry: "中文内容运营与创作者工具"
    })
  );

  const brandProfile = await request.get("/api/brand-profiles/brand_profile_001", {
    headers: { Cookie: ownerCookie }
  });
  expect(brandProfile.ok()).toBeTruthy();
  await expect(brandProfile.json()).resolves.toMatchObject({
    data: {
      id: "brand_profile_001",
      name: "ContentOS"
    }
  });

  const platformAuthorizations = await request.get("/api/data-sources/platform-authorizations", {
    headers: { Cookie: ownerCookie }
  });
  expect(platformAuthorizations.ok()).toBeTruthy();
  const platformAuthorizationPayload = await platformAuthorizations.json();
  expect(platformAuthorizationPayload.data.accounts.length).toBeGreaterThan(0);
  expect(platformAuthorizationPayload.data.authorizations[0]).toHaveProperty("hasTokenRef");
  expect(platformAuthorizationPayload.data.authorizations[0]).not.toHaveProperty("tokenRef");

  const analyticsOverview = await request.get("/api/analytics/overview", {
    headers: { Cookie: ownerCookie }
  });
  expect(analyticsOverview.ok()).toBeTruthy();
  const analyticsPayload = await analyticsOverview.json();
  expect(analyticsPayload.data.publishedPosts.length).toBeGreaterThan(0);
  expect(analyticsPayload.data.postDailyMetrics.length).toBeGreaterThan(0);
  expect(analyticsPayload.data.accountDailyMetrics.length).toBeGreaterThan(0);

  const invitations = await request.get("/api/workspaces/ws_demo/invitations", {
    headers: { Cookie: ownerCookie }
  });
  expect(invitations.ok()).toBeTruthy();
  const invitationsPayload = await invitations.json();
  expect(invitationsPayload.data.length).toBeGreaterThan(0);

  const notifications = await request.get("/api/notifications", {
    headers: { Cookie: ownerCookie }
  });
  expect(notifications.ok()).toBeTruthy();
  const notificationsPayload = await notifications.json();
  expect(notificationsPayload.data.length).toBeGreaterThan(0);

  const systemSettings = await request.get("/api/settings/system", {
    headers: { Cookie: ownerCookie }
  });
  expect(systemSettings.ok()).toBeTruthy();
  const systemSettingsPayload = await systemSettings.json();
  expect(systemSettingsPayload.data.map((setting: { key: string }) => setting.key)).toContain("risk_review_policy");

  const agentRuns = await request.get("/api/agent-runs", {
    headers: { Cookie: ownerCookie }
  });
  expect(agentRuns.ok()).toBeTruthy();
  const beforeRunsPayload = await agentRuns.json();
  const beforeRunIds = new Set(beforeRunsPayload.data.map((run: { id: string }) => run.id));

  const retry = await request.post("/api/agent-runs/run_002/retry", {
    headers: { Cookie: ownerCookie }
  });
  expect(retry.ok()).toBeTruthy();
  await expect(retry.json()).resolves.toMatchObject({
    data: { riskLevel: "LOW" }
  });

  const afterRuns = await request.get("/api/agent-runs", {
    headers: { Cookie: ownerCookie }
  });
  expect(afterRuns.ok()).toBeTruthy();
  const afterRunsPayload = await afterRuns.json();
  const retryRun = afterRunsPayload.data.find(
    (run: { id: string; agentType: string; status: string; input: unknown }) =>
      !beforeRunIds.has(run.id) && run.agentType === "RISK"
  );
  expect(retryRun).toMatchObject({
    agentType: "RISK",
    status: "SUCCESS",
    input: {
      contentDraftId: "content_001"
    }
  });

  const usageAfterRetry = await request.get("/api/settings/usage", {
    headers: { Cookie: ownerCookie }
  });
  expect(usageAfterRetry.ok()).toBeTruthy();
  const usageAfterRetryPayload = await usageAfterRetry.json();
  expect(usageAfterRetryPayload.data.usageEvents).toContainEqual(
    expect.objectContaining({
      eventType: "agent.run",
      quantity: 1,
      metadata: expect.objectContaining({
        agentRunId: retryRun.id,
        agentType: "RISK",
        status: "SUCCESS",
        model: "mock-contentos-v1"
      })
    })
  );
  expect(usageAfterRetryPayload.data.creditLedger).toContainEqual(
    expect.objectContaining({
      reason: "RISK Agent token usage",
      metadata: expect.objectContaining({
        agentRunId: retryRun.id
      })
    })
  );

  const auditLogs = await request.get("/api/audit-logs", {
    headers: { Cookie: ownerCookie }
  });
  expect(auditLogs.ok()).toBeTruthy();
  const auditPayload = await auditLogs.json();
  expect(auditPayload.data[0]).toMatchObject({
    action: "agent.retry",
    entityType: "AgentRun",
    metadata: {
      originalRunId: "run_002",
      retryStatus: "SUCCESS"
    }
  });
});

test("switches calendar views and filters publish plans by platform", async ({ page }) => {
  await loginAsOwner(page, "/calendar");
  await expect(page.getByRole("heading", { name: "内容日历" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "周视图" })).toBeVisible();

  await page.getByRole("button", { name: "月视图" }).click();
  await expect(page.getByRole("heading", { name: "月视图" })).toBeVisible();

  await page.getByLabel("按平台筛选").selectOption("DOUYIN");
  await expect(page.getByText("一条热点拆三端版本").first()).toBeVisible();
  await expect(page.getByText("小团队别急着买更多 AI 工具")).toHaveCount(0);
});

test("edits a content draft and records a new version", async ({ page }) => {
  await loginAsOwner(page, "/content");
  await expect(page.getByRole("heading", { name: "内容工作台" })).toBeVisible();

  await expect(page.getByText("当前版本 v2")).toBeVisible();
  await page.getByLabel("内容标题").fill("E2E 编辑后的内容标题");
  await page.getByLabel("内容正文").fill("E2E 编辑后的内容正文");
  await page.getByLabel("内容状态").selectOption("IN_REVIEW");

  const saveResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/contents/content_001") && response.request().method() === "PATCH"
  );
  await page.getByRole("button", { name: "保存草稿" }).click();
  const saveResponse = await saveResponsePromise;
  expect(saveResponse.ok()).toBeTruthy();

  await expect(page.getByRole("status")).toHaveText("已保存");
  await expect(page.getByLabel("内容标题")).toHaveValue("E2E 编辑后的内容标题");
  await expect(page.getByLabel("内容正文")).toHaveValue("E2E 编辑后的内容正文");
  await expect(page.getByLabel("内容状态")).toHaveValue("IN_REVIEW");
  await expect(page.getByText("当前版本 v3")).toBeVisible();
  await expect(page.getByText("v3").first()).toBeVisible();
});

test("imports analytics metrics from an uploaded CSV file", async ({ page }) => {
  await loginAsOwner(page, "/analytics");
  await expect(page.getByRole("heading", { name: "数据分析" })).toBeVisible();
  await expect(page.getByRole("button", { name: "上传数据文件" })).toBeVisible();

  const analyticsImportResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/analytics/import") && response.request().method() === "POST"
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e-metrics.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "title,platform,views,likes,comments,shares,conversions,publishedAt\nE2E file upload,WECHAT,321,22,3,4,1,2026-06-08"
    )
  });
  const analyticsImportResponse = await analyticsImportResponsePromise;
  expect(analyticsImportResponse.ok()).toBeTruthy();
  await expect(page.getByText("e2e-metrics.csv")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("已导入 1 行");
});

test("invites a workspace member with an explicit role", async ({ page }) => {
  const email = `e2e-invite-${Date.now()}@contentos.local`;

  await loginAsOwner(page, "/team");
  await expect(page.getByRole("heading", { name: "团队与权限" })).toBeVisible();
  await page.getByLabel("成员邮箱").fill(email);
  await page.getByLabel("成员角色").selectOption("EDITOR");
  await page.getByLabel("成员职能").fill("E2E 内容编辑");

  const inviteResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/workspaces/ws_demo/members") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "邀请成员" }).click();
  const inviteResponse = await inviteResponsePromise;
  expect(inviteResponse.ok()).toBeTruthy();

  await expect(page.getByRole("status")).toHaveText("邀请已发送");
  const memberRow = page.locator("tr", { hasText: email }).filter({ hasText: "E2E 内容编辑" });
  await expect(memberRow).toBeVisible();
  await expect(memberRow.getByLabel(`调整权限：${email}`)).toHaveValue("EDITOR");

  await memberRow.getByLabel(`调整权限：${email}`).selectOption("ANALYST");
  const roleResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/workspaces/ws_demo/members/") && response.request().method() === "PATCH"
  );
  await memberRow.getByRole("button", { name: "保存角色" }).click();
  const roleResponse = await roleResponsePromise;
  expect(roleResponse.ok()).toBeTruthy();

  await expect(memberRow.getByRole("status")).toHaveText("角色已更新");
  await expect(memberRow.getByLabel(`调整权限：${email}`)).toHaveValue("ANALYST");
});

test("logs out and clears access to protected pages", async ({ page }) => {
  await loginAsOwner(page);

  const logoutResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/auth/logout") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "退出登录" }).click();
  const logoutResponse = await logoutResponsePromise;
  expect(logoutResponse.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/login$/);

  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === "contentos_session")).toBe(false);
  expect(cookies.some((cookie) => cookie.name === "contentos_workspace")).toBe(false);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
});

test("enforces API tenant isolation and role permissions", async ({ request }) => {
  const me = await request.get("/api/me", {
    headers: { Cookie: ownerCookie }
  });
  expect(me.ok()).toBeTruthy();
  const mePayload = await me.json();
  expect(mePayload.data.workspaces.map((workspace: { id: string }) => workspace.id)).toEqual(["ws_demo", "ws_brand"]);

  const crossWorkspace = await request.get("/api/hotspots?workspaceId=ws_private", {
    headers: { Cookie: ownerCookie }
  });
  expect(crossWorkspace.status()).toBe(403);

  const analystSchedule = await request.post("/api/contents/content_001/schedule", {
    headers: {
      Cookie: "contentos_session=mock:user_analyst; contentos_workspace=ws_demo"
    },
    data: {
      platform: "XIAOHONGSHU",
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString()
    }
  });
  expect(analystSchedule.status()).toBe(403);
});

test("switches workspaces and scopes default API reads to the active workspace", async ({ page }) => {
  await loginAsOwner(page);
  const switcher = page.getByLabel("切换 workspace");
  await expect(switcher).toHaveValue("ws_demo");

  const switchResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/workspaces/switch") && response.request().method() === "POST"
  );
  await switcher.selectOption("ws_brand");
  const switchResponse = await switchResponsePromise;
  expect(switchResponse.ok()).toBeTruthy();
  await expect(switcher).toHaveValue("ws_brand");
  await expect(page.getByText("Client")).toBeVisible();
  await expect(page.getByText("私域品牌如何用季度主题降低内容内耗")).toBeVisible();

  await expect
    .poll(async () => {
      const brandPayload = await page.evaluate(async () => {
        const response = await fetch("/api/hotspots");
        return response.json();
      });
      return brandPayload.data.map((item: { id: string; workspaceId: string }) => ({
        id: item.id,
        workspaceId: item.workspaceId
      }));
    })
    .toEqual([{ id: "hot_004", workspaceId: "ws_brand" }]);

  await expect(page.getByRole("button", { name: "新建" })).toBeVisible();
  const createdWorkspace = await page.evaluate(async () => {
    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `E2E Workspace ${Date.now()}`,
        organizationName: "E2E 自动化组织"
      })
    });
    if (!response.ok) {
      throw new Error(`workspace create failed: ${response.status}`);
    }
    const payload = await response.json();
    return payload.data as { id: string; name: string };
  });
  await page.reload();
  await expect(switcher).toHaveValue(createdWorkspace.id);
  await expect(switcher.locator(`option[value="${createdWorkspace.id}"]`)).toHaveText(createdWorkspace.name);

  const resetOk = await page.evaluate(async () => {
    const response = await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws_demo" })
    });
    return response.ok;
  });
  expect(resetOk).toBeTruthy();
});

test("exposes API key, webhook, and usage reserves with RBAC", async ({ page, request }) => {
  await loginAsOwner(page, "/settings");
  await expect(page.getByRole("heading", { name: "设置", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "API Key", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Webhook", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "用量与额度", exact: true })).toBeVisible();
  await expect(page.getByText("最近用量事件")).toBeVisible();
  await expect(page.getByRole("heading", { name: "品牌设置", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "数据保留策略", exact: true })).toBeVisible();
  await expect(page.getByText("错误日志", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "系统设置", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "通知中心", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "API 错误日志", exact: true })).toBeVisible();
  await expect(page.getByText("Server ingest key")).toBeVisible();

  const keys = await request.get("/api/settings/api-keys", {
    headers: { Cookie: ownerCookie }
  });
  expect(keys.ok()).toBeTruthy();
  const keysPayload = await keys.json();
  expect(keysPayload.data.length).toBeGreaterThan(0);
  expect(keysPayload.data[0]).not.toHaveProperty("keyHash");
  expect(keysPayload.data[0]).toHaveProperty("keyPreview");

  const createdKey = await request.post("/api/settings/api-keys", {
    headers: { Cookie: ownerCookie },
    data: { name: `E2E Key ${Date.now()}` }
  });
  expect(createdKey.ok()).toBeTruthy();
  const createdKeyPayload = await createdKey.json();
  expect(createdKeyPayload.data.secret).toMatch(/^cos_/);
  expect(createdKeyPayload.data.apiKey).not.toHaveProperty("keyHash");

  const revokedKey = await request.delete(`/api/settings/api-keys/${createdKeyPayload.data.apiKey.id}`, {
    headers: { Cookie: ownerCookie }
  });
  expect(revokedKey.ok()).toBeTruthy();
  await expect(revokedKey.json()).resolves.toMatchObject({
    data: { id: createdKeyPayload.data.apiKey.id }
  });

  const webhooks = await request.get("/api/settings/webhooks", {
    headers: { Cookie: ownerCookie }
  });
  expect(webhooks.ok()).toBeTruthy();
  const webhooksPayload = await webhooks.json();
  expect(webhooksPayload.data.length).toBeGreaterThan(0);
  expect(webhooksPayload.data[0]).not.toHaveProperty("secretHash");

  const disabledWebhook = await request.patch(`/api/settings/webhooks/${webhooksPayload.data[0].id}`, {
    headers: { Cookie: ownerCookie },
    data: { enabled: false }
  });
  expect(disabledWebhook.ok()).toBeTruthy();
  await expect(disabledWebhook.json()).resolves.toMatchObject({
    data: { id: webhooksPayload.data[0].id, enabled: false }
  });

  const usage = await request.get("/api/settings/usage", {
    headers: { Cookie: ownerCookie }
  });
  expect(usage.ok()).toBeTruthy();
  const usagePayload = await usage.json();
  expect(usagePayload.data.creditBalance).toBeLessThanOrEqual(4880);
  expect(usagePayload.data.usageTotal).toBeGreaterThan(0);
  expect(usagePayload.data.usageEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        eventType: "agent.run"
      })
    ])
  );

  const viewerDenied = await request.get("/api/settings/api-keys", {
    headers: { Cookie: "contentos_session=mock:user_editor; contentos_workspace=ws_demo" }
  });
  expect(viewerDenied.status()).toBe(403);

  const invalidCalendarItem = await request.post("/api/calendar/items?workspaceId=ws_demo", {
    headers: { Cookie: ownerCookie },
    data: {
      title: "Missing platform and scheduledAt"
    }
  });
  expect(invalidCalendarItem.status()).toBe(422);

  const errorLogs = await request.get("/api/settings/error-logs", {
    headers: { Cookie: ownerCookie }
  });
  expect(errorLogs.ok()).toBeTruthy();
  const errorLogsPayload = await errorLogs.json();
  expect(errorLogsPayload.data.length).toBeGreaterThan(0);
  expect(errorLogsPayload.data[0]).toMatchObject({
    status: 422,
    route: "/api/calendar/items?workspaceId=ws_demo",
    hasStack: true
  });
  expect(errorLogsPayload.data[0]).not.toHaveProperty("stack");
});

test("normalizes API validation errors through the shared handler", async ({ request }) => {
  const invalidCalendarItem = await request.post("/api/calendar/items", {
    headers: { Cookie: ownerCookie },
    data: {
      title: "Missing platform and scheduledAt"
    }
  });

  expect(invalidCalendarItem.status()).toBe(422);
  const payload = await invalidCalendarItem.json();
  expect(payload).toEqual({ error: "请求参数不符合接口要求" });
});

test("registers users with session cookies and rejects invalid logins", async ({ request }) => {
  const email = `e2e-${Date.now()}@contentos.local`;
  const register = await request.post("/api/auth/register", {
    data: {
      email,
      password: "contentos123",
      name: "E2E 注册成员"
    }
  });

  expect(register.ok()).toBeTruthy();
  const setCookie = register.headers()["set-cookie"];
  expect(setCookie).toContain("contentos_session=");
  expect(setCookie).toContain("contentos_workspace=");
  const payload = await register.json();
  expect(payload.data).toMatchObject({
    workspaceId: "ws_demo",
    user: { email, role: "VIEWER" }
  });

  const invalidLogin = await request.post("/api/auth/login", {
    data: {
      email: `missing-${Date.now()}@contentos.local`,
      password: "contentos123"
    }
  });
  expect(invalidLogin.status()).toBe(401);
  await expect(invalidLogin.json()).resolves.toEqual({ error: "邮箱或密码不正确" });
});
