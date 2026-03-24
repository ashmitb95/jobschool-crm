import { test as setup, expect } from "@playwright/test";
import { execSync } from "child_process";
import { USERS, BASE_URL } from "./test-data";

// Reset database before all tests
setup("reset database", async () => {
  execSync("npx tsx prisma/seed.ts", { cwd: process.cwd(), stdio: "pipe" });
});

// Create storage states for each role
for (const [key, user] of Object.entries(USERS)) {
  setup(`authenticate as ${key}`, async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: user.username, password: user.password },
    });
    expect(res.ok()).toBeTruthy();

    // Save the storage state (cookies) for this role
    await request.storageState({ path: `tests/e2e/.auth/${key}.json` });
  });
}
