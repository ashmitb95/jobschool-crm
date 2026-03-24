import { test, expect } from "../fixtures/api.fixture";
import { USERS } from "../fixtures/test-data";

test.describe("Auth API", () => {
  // ─── Login ──────────────────────────────────────────────────────────────────

  test.describe("Login", () => {
    test("POST /api/auth/login valid admin returns 200 with user data", async ({
      api,
    }) => {
      const res = await api.unauthenticated().post("/api/auth/login", {
        username: USERS.admin.username,
        password: USERS.admin.password,
      });

      expect(res.status).toBe(200);
      const body = res.data as {
        success: boolean;
        data: {
          username: string;
          role: string;
          redirect: string;
          displayName: string;
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.username).toBe(USERS.admin.username);
      expect(body.data.role).toBe(USERS.admin.role);
      expect(body.data.redirect).toBe(USERS.admin.redirect);
      expect(body.data.displayName).toBeTruthy();
    });

    test("POST /api/auth/login valid member returns 200 with redirect=/pipeline", async ({
      api,
    }) => {
      const res = await api.unauthenticated().post("/api/auth/login", {
        username: USERS.member.username,
        password: USERS.member.password,
      });

      expect(res.status).toBe(200);
      const body = res.data as {
        success: boolean;
        data: { redirect: string; role: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.redirect).toBe("/pipeline");
      expect(body.data.role).toBe("member");
    });

    test("POST /api/auth/login valid superadmin returns 200 with redirect=/manage", async ({
      api,
    }) => {
      const res = await api.unauthenticated().post("/api/auth/login", {
        username: USERS.superAdmin.username,
        password: USERS.superAdmin.password,
      });

      expect(res.status).toBe(200);
      const body = res.data as {
        success: boolean;
        data: { redirect: string; role: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.redirect).toBe("/manage");
      expect(body.data.role).toBe("super_admin");
    });

    test("POST /api/auth/login wrong password returns 401", async ({
      api,
    }) => {
      const res = await api.unauthenticated().post("/api/auth/login", {
        username: USERS.admin.username,
        password: "wrong_password",
      });

      expect(res.status).toBe(401);
      expect(res.ok).toBe(false);
    });

    test("POST /api/auth/login empty username returns 400", async ({
      api,
    }) => {
      const res = await api.unauthenticated().post("/api/auth/login", {
        username: "",
        password: USERS.admin.password,
      });

      expect(res.status).toBe(400);
      expect(res.ok).toBe(false);
    });

    test("POST /api/auth/login empty password returns 400", async ({
      api,
    }) => {
      const res = await api.unauthenticated().post("/api/auth/login", {
        username: USERS.admin.username,
        password: "",
      });

      expect(res.status).toBe(400);
      expect(res.ok).toBe(false);
    });

    test("POST /api/auth/login nonexistent user returns 401", async ({
      api,
    }) => {
      const res = await api.unauthenticated().post("/api/auth/login", {
        username: "nonexistent_user_xyz",
        password: "some_password",
      });

      expect(res.status).toBe(401);
      expect(res.ok).toBe(false);
    });
  });

  // ─── Session ────────────────────────────────────────────────────────────────

  test.describe("Session", () => {
    test("GET /api/auth/me as admin returns 200 with user, pipelines, org", async ({
      api,
    }) => {
      const res = await api.asAdmin().get("/api/auth/me");

      expect(res.status).toBe(200);
      const body = res.data as {
        success: boolean;
        data: {
          user: { username: string; role: string };
          pipelines: unknown[];
          org: { name: string; slug: string } | null;
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.user).toBeTruthy();
      expect(body.data.user.username).toBe(USERS.admin.username);
      expect(body.data.user.role).toBe(USERS.admin.role);
      expect(body.data.pipelines).toBeDefined();
      expect(Array.isArray(body.data.pipelines)).toBe(true);
      expect(body.data.org).toBeTruthy();
    });

    test("GET /api/auth/me unauthenticated returns 401", async ({ api }) => {
      const res = await api.unauthenticated().get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.ok).toBe(false);
    });
  });

  // ─── Logout ─────────────────────────────────────────────────────────────────

  test.describe("Logout", () => {
    test("POST /api/auth/logout invalidates session so subsequent /me returns 401", async ({
      api,
    }) => {
      // Verify the admin session is active
      const meBefore = await api.asAdmin().get("/api/auth/me");
      expect(meBefore.status).toBe(200);

      // Logout (authedFetch logs in first, then calls logout — which clears the session)
      const logoutRes = await api.asAdmin().post("/api/auth/logout");
      expect(logoutRes.status).toBe(200);
      const logoutBody = logoutRes.data as { success: boolean };
      expect(logoutBody.success).toBe(true);

      // After logout, an unauthenticated /me should return 401
      const meAfter = await api.unauthenticated().get("/api/auth/me");
      expect(meAfter.status).toBe(401);
    });
  });

  // ─── Change Password ───────────────────────────────────────────────────────

  test.describe("Change Password", () => {
    test("POST /api/auth/change-password with correct current password returns 200", async ({
      api,
    }) => {
      const tempPassword = "temppassword123";

      // Change password from original to temporary
      const changeRes = await api.asMember().post("/api/auth/change-password", {
        currentPassword: USERS.member.password,
        newPassword: tempPassword,
      });

      expect(changeRes.status).toBe(200);
      const body = changeRes.data as {
        success: boolean;
        data: { message: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.message).toContain("Password changed");

      // Verify login with new password works
      const loginRes = await api.unauthenticated().post("/api/auth/login", {
        username: USERS.member.username,
        password: tempPassword,
      });
      expect(loginRes.status).toBe(200);

      // Restore original password: the login above set cookies in the context,
      // so the context is now authenticated as member with the new password.
      // Use unauthenticated().post which shares the same request context (with cookies).
      const restoreRes = await api
        .unauthenticated()
        .post("/api/auth/change-password", {
          currentPassword: tempPassword,
          newPassword: USERS.member.password,
        });
      expect(restoreRes.status).toBe(200);
    });

    test("POST /api/auth/change-password with wrong current password returns 400", async ({
      api,
    }) => {
      const res = await api.asAdmin().post("/api/auth/change-password", {
        currentPassword: "definitely_wrong_password",
        newPassword: "newpassword123",
      });

      expect(res.status).toBe(400);
      expect(res.ok).toBe(false);
    });

    test("POST /api/auth/change-password with short new password returns 400", async ({
      api,
    }) => {
      const res = await api.asAdmin().post("/api/auth/change-password", {
        currentPassword: USERS.admin.password,
        newPassword: "abc",
      });

      expect(res.status).toBe(400);
      expect(res.ok).toBe(false);
    });

    test("POST /api/auth/change-password unauthenticated returns 401", async ({
      api,
    }) => {
      const res = await api
        .unauthenticated()
        .post("/api/auth/change-password", {
          currentPassword: "anything",
          newPassword: "newpassword123",
        });

      expect(res.status).toBe(401);
      expect(res.ok).toBe(false);
    });
  });
});
