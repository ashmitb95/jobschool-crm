import { test, expect } from "@playwright/test";
import { BASE_URL } from "../fixtures/test-data";

const superAdminAuth = { storageState: "tests/e2e/.auth/superAdmin.json" };

test.describe("Manage Page (Super Admin)", () => {
  test.use(superAdminAuth);

  test("manage page loads for super admin", async ({ page }) => {
    await page.goto(`${BASE_URL}/manage`);
    await page.waitForLoadState("networkidle");

    // The page title should mention Organizations
    await expect(page.getByText("Organizations")).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows organization list", async ({ page }) => {
    await page.goto(`${BASE_URL}/manage`);
    await page.waitForLoadState("networkidle");

    // Should display at least the seeded org (JobSchool)
    const orgList = page.locator("[class*='divide-y']").first();
    await expect(orgList).toBeVisible({ timeout: 10000 });

    // Look for the seed org name
    const orgEntry = page.getByText("JobSchool");
    await expect(orgEntry).toBeVisible({ timeout: 10000 });
  });

  test("'Create Organization' button is visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/manage`);
    await page.waitForLoadState("networkidle");

    const createButton = page.getByRole("button", {
      name: /create organization/i,
    });
    await expect(createButton).toBeVisible({ timeout: 10000 });
  });

  test("org list shows user and pipeline counts", async ({ page }) => {
    await page.goto(`${BASE_URL}/manage`);
    await page.waitForLoadState("networkidle");

    // Each org row shows "X users" and "X pipelines"
    const usersText = page.getByText(/\d+ users/);
    await expect(usersText.first()).toBeVisible({ timeout: 10000 });

    const pipelinesText = page.getByText(/\d+ pipelines/);
    await expect(pipelinesText.first()).toBeVisible({ timeout: 10000 });
  });

  test("clicking an org navigates to org detail view", async ({ page }) => {
    await page.goto(`${BASE_URL}/manage`);
    await page.waitForLoadState("networkidle");

    // Click the first org in the list
    const orgButton = page.locator("[class*='divide-y'] button").first();
    await expect(orgButton).toBeVisible({ timeout: 10000 });
    await orgButton.click();

    // Should show org detail view with "Users" heading and a "Back" button
    const backButton = page.getByRole("button", { name: /back/i });
    await expect(backButton).toBeVisible({ timeout: 10000 });

    const usersHeading = page.getByText("Users");
    await expect(usersHeading).toBeVisible();
  });
});
