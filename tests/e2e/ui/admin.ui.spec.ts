import { test, expect } from "@playwright/test";
import { BASE_URL } from "../fixtures/test-data";

const adminAuth = { storageState: "tests/e2e/.auth/admin.json" };

test.describe("Admin Page", () => {
  test.use(adminAuth);

  test("admin page loads and shows tabs", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // The admin page has tabs: Users, Pipelines, Access
    const usersTab = page.getByRole("button", { name: /users/i });
    const pipelinesTab = page.getByRole("button", { name: /pipelines/i });
    const accessTab = page.getByRole("button", { name: /access/i });

    await expect(usersTab).toBeVisible({ timeout: 10000 });
    await expect(pipelinesTab).toBeVisible();
    await expect(accessTab).toBeVisible();
  });

  test("users tab shows user rows", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // Users tab is active by default
    // Wait for user list to load
    const userList = page.locator("[class*='divide-y']").first();
    await expect(userList).toBeVisible({ timeout: 10000 });

    // Should have at least one user row
    const userRows = userList.locator("> div");
    const count = await userRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("users tab shows role badges", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // Role badges should appear next to user names
    const badges = page.locator("[data-slot='badge']");
    await expect(badges.first()).toBeVisible({ timeout: 10000 });
  });

  test("'Add User' button is visible on users tab", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    const addUserButton = page.getByRole("button", { name: /add user/i });
    await expect(addUserButton).toBeVisible({ timeout: 10000 });
  });

  test("pipelines tab shows pipeline rows", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // Click the Pipelines tab
    const pipelinesTab = page.getByRole("button", { name: /pipelines/i });
    await pipelinesTab.click();

    // Wait for pipeline list to load
    const pipelineList = page.locator("[class*='divide-y']").first();
    await expect(pipelineList).toBeVisible({ timeout: 10000 });

    const pipelineRows = pipelineList.locator("> div");
    const count = await pipelineRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("'Add Pipeline' button is visible on pipelines tab", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // Switch to Pipelines tab
    const pipelinesTab = page.getByRole("button", { name: /pipelines/i });
    await pipelinesTab.click();

    const addPipelineButton = page.getByRole("button", {
      name: /add pipeline/i,
    });
    await expect(addPipelineButton).toBeVisible({ timeout: 10000 });
  });

  test("access tab shows pipeline access matrix", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // Switch to Access tab
    const accessTab = page.getByRole("button", { name: /access/i });
    await accessTab.click();

    // Should show a table with user/pipeline checkboxes
    const accessHeading = page.getByText("Pipeline Access");
    await expect(accessHeading).toBeVisible({ timeout: 10000 });
  });

  test("admin page title shows 'Admin'", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Admin").first()).toBeVisible({
      timeout: 10000,
    });
  });
});
