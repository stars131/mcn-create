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
});

test("opens the dashboard and serves core mock workflow data", async ({ page, request }) => {
  await loginAsOwner(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "内容运营驾驶舱" })).toBeVisible();
  await expect(page.getByText("今日热点数量")).toBeVisible();

  await page.goto("/hotspots");
  await expect(page.getByRole("heading", { name: "热点中心" })).toBeVisible();
  await expect(page.getByRole("button", { name: "刷新热点" })).toBeVisible();

  const hotspots = await request.get("/api/hotspots", {
    headers: { Cookie: ownerCookie }
  });
  expect(hotspots.ok()).toBeTruthy();
  expect(hotspots.headers()["x-content-type-options"]).toBe("nosniff");
  expect(hotspots.headers()["x-frame-options"]).toBe("DENY");
  const hotspotPayload = await hotspots.json();
  expect(hotspotPayload.data.length).toBeGreaterThan(0);

  const agentRuns = await request.get("/api/agent-runs", {
    headers: { Cookie: ownerCookie }
  });
  expect(agentRuns.ok()).toBeTruthy();
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
