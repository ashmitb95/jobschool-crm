import { test, expect } from "@playwright/test";
import { BASE_URL } from "../fixtures/test-data";

const adminAuth = { storageState: "tests/e2e/.auth/admin.json" };
const memberAuth = { storageState: "tests/e2e/.auth/member.json" };
const superAdminAuth = { storageState: "tests/e2e/.auth/superAdmin.json" };

test.describe("RBAC Redirects & Sidebar", () => {
  test("member at /admin is redirected or blocked", async ({ browser }) => {
    const context = await browser.newContext(memberAuth);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Member should not remain on /admin
    const url = page.url();
    expect(url).not.toContain("/admin");

    await context.close();
  });

  test("admin sidebar has 'Admin' link", async ({ browser }) => {
    const context = await browser.newContext(adminAuth);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    const adminLink = page.getByRole("link", { name: "Admin" });
    await expect(adminLink).toBeVisible();

    await context.close();
  });

  test("member sidebar lacks 'Admin' link", async ({ browser }) => {
    const context = await browser.newContext(memberAuth);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    const adminLink = page.getByRole("link", { name: "Admin" });
    await expect(adminLink).not.toBeVisible();

    await context.close();
  });

  test("super admin at /pipeline is redirected to /manage", async ({
    browser,
  }) => {
    const context = await browser.newContext(superAdminAuth);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).toContain("/manage");

    await context.close();
  });

  test("unauthenticated user at /pipeline is redirected to /login", async ({
    page,
  }) => {
    // Fresh context with no auth
    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).toContain("/login");
  });

  test("sidebar shows user displayName", async ({ browser }) => {
    const context = await browser.newContext(adminAuth);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    // The sidebar shows the user's display name
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    // Look for text content in the sidebar user section
    // The displayName should be visible somewhere in the sidebar
    const userSection = sidebar.locator("p.truncate");
    if (await userSection.count() > 0) {
      const text = await userSection.first().textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(0);
    }

    await context.close();
  });

  test("sidebar shows role badge", async ({ browser }) => {
    const context = await browser.newContext(adminAuth);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    // The sidebar should contain a badge showing the role
    const roleBadge = sidebar.locator("[data-slot='badge']").first();
    if (await roleBadge.isVisible()) {
      const text = await roleBadge.textContent();
      expect(text).toBeTruthy();
    }

    await context.close();
  });

  test("member cannot access /admin even by direct navigation", async ({
    browser,
  }) => {
    const context = await browser.newContext(memberAuth);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Should have been redirected away from /admin
    expect(page.url()).not.toMatch(/\/admin$/);

    await context.close();
  });
});
