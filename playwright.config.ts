import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/reports/html", open: "never" }],
    ["json", { outputFile: "tests/reports/results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      testDir: "./tests/e2e/fixtures",
    },
    {
      name: "api",
      testMatch: /\.api\.spec\.ts/,
      testDir: "./tests/e2e/api",
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "ui",
      testMatch: /\.ui\.spec\.ts/,
      testDir: "./tests/e2e/ui",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
