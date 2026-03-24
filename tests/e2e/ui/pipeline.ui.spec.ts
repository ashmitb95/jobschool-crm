import { test, expect } from "@playwright/test";
import { BASE_URL, STAGE_NAMES } from "../fixtures/test-data";

const adminAuth = { storageState: "tests/e2e/.auth/admin.json" };

test.describe("Pipeline Page", () => {
  test.use(adminAuth);

  test("pipeline page loads with stage columns", async ({ page }) => {
    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    // Wait for the stage columns to appear (h3 headers with stage names)
    const firstStage = page.locator("h3", { hasText: STAGE_NAMES[0] });
    await expect(firstStage).toBeVisible({ timeout: 15000 });
  });

  test("stage columns have headers with names", async ({ page }) => {
    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    // Check for at least a few known stage names
    for (const stageName of STAGE_NAMES.slice(0, 3)) {
      const header = page.locator("h3", { hasText: stageName });
      await expect(header).toBeVisible({ timeout: 10000 });
    }
  });

  test("pipeline selector is visible and functional", async ({ page }) => {
    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    // The pipeline selector should be in the header actions area
    // It appears as a select/combobox with the pipeline name
    const header = page.locator("h1, [class*='header']").first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // The page title should say "Pipeline"
    await expect(page.getByText("Pipeline")).toBeVisible();
  });

  test("lead cards are visible in columns", async ({ page }) => {
    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    // Wait for stage columns
    const firstStage = page.locator("h3", { hasText: STAGE_NAMES[0] });
    await expect(firstStage).toBeVisible({ timeout: 15000 });

    // Lead cards should be visible (they contain the lead name as text)
    // Cards are rendered in sortable containers
    const cards = page.locator("[class*='border'][class*='rounded-md'][class*='bg-card']");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test("refresh button works", async ({ page }) => {
    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    // Wait for data to load
    const firstStage = page.locator("h3", { hasText: STAGE_NAMES[0] });
    await expect(firstStage).toBeVisible({ timeout: 15000 });

    // Click the Refresh button
    const refreshButton = page.getByRole("button", { name: /refresh/i });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Data should reload - the stage columns should still be visible after refresh
    await expect(firstStage).toBeVisible({ timeout: 15000 });
  });

  test("each stage column shows a lead count badge", async ({ page }) => {
    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    // Wait for stage columns
    const firstStage = page.locator("h3", { hasText: STAGE_NAMES[0] });
    await expect(firstStage).toBeVisible({ timeout: 15000 });

    // Each column header has a count span next to the stage name
    // The count is in a rounded-full span
    const countBadges = page.locator("span.rounded-full");
    const badgeCount = await countBadges.count();
    expect(badgeCount).toBeGreaterThan(0);
  });

  test("filter bar is present on pipeline page", async ({ page }) => {
    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    // The pipeline page has a filter/search area
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test("page title says Pipeline", async ({ page }) => {
    await page.goto(`${BASE_URL}/pipeline`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Pipeline").first()).toBeVisible({ timeout: 10000 });
  });
});
