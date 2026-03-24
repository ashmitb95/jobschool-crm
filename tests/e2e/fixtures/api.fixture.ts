import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { USERS, BASE_URL } from "./test-data";

type Role = keyof typeof USERS;

export class ApiHelper {
  private cookies: Record<Role, string | null> = {
    superAdmin: null,
    admin: null,
    member: null,
  };

  constructor(private request: APIRequestContext) {}

  async loginAs(role: Role): Promise<string> {
    if (this.cookies[role]) return this.cookies[role]!;

    const user = USERS[role];
    const res = await this.request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: user.username, password: user.password },
    });
    expect(res.ok()).toBeTruthy();

    // Extract cookies from the response
    const setCookieHeaders = res.headers()["set-cookie"] || "";
    this.cookies[role] = setCookieHeaders;

    return setCookieHeaders;
  }

  private async authedFetch(
    method: string,
    url: string,
    role: Role,
    body?: unknown
  ) {
    // Login first to get cookies in the context
    const user = USERS[role];
    const loginRes = await this.request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: user.username, password: user.password },
    });
    expect(loginRes.ok()).toBeTruthy();

    // Now the context has the cookies set
    const options: Record<string, unknown> = {};
    if (body !== undefined) {
      options.data = body;
    }

    const res = await this.request.fetch(`${BASE_URL}${url}`, {
      method,
      ...options,
    });

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status(), data, ok: res.ok() };
  }

  // Pre-authed helpers
  asAdmin() {
    return {
      get: (url: string) => this.authedFetch("GET", url, "admin"),
      post: (url: string, body?: unknown) => this.authedFetch("POST", url, "admin", body),
      patch: (url: string, body?: unknown) => this.authedFetch("PATCH", url, "admin", body),
      put: (url: string, body?: unknown) => this.authedFetch("PUT", url, "admin", body),
      delete: (url: string) => this.authedFetch("DELETE", url, "admin"),
    };
  }

  asMember() {
    return {
      get: (url: string) => this.authedFetch("GET", url, "member"),
      post: (url: string, body?: unknown) => this.authedFetch("POST", url, "member", body),
      patch: (url: string, body?: unknown) => this.authedFetch("PATCH", url, "member", body),
      put: (url: string, body?: unknown) => this.authedFetch("PUT", url, "member", body),
      delete: (url: string) => this.authedFetch("DELETE", url, "member"),
    };
  }

  asSuperAdmin() {
    return {
      get: (url: string) => this.authedFetch("GET", url, "superAdmin"),
      post: (url: string, body?: unknown) => this.authedFetch("POST", url, "superAdmin", body),
      patch: (url: string, body?: unknown) => this.authedFetch("PATCH", url, "superAdmin", body),
      put: (url: string, body?: unknown) => this.authedFetch("PUT", url, "superAdmin", body),
      delete: (url: string) => this.authedFetch("DELETE", url, "superAdmin"),
    };
  }

  unauthenticated() {
    return {
      get: async (url: string) => {
        const res = await this.request.fetch(`${BASE_URL}${url}`, { method: "GET" });
        let data: unknown;
        try { data = await res.json(); } catch { data = null; }
        return { status: res.status(), data, ok: res.ok() };
      },
      post: async (url: string, body?: unknown) => {
        const res = await this.request.fetch(`${BASE_URL}${url}`, {
          method: "POST",
          ...(body !== undefined ? { data: body } : {}),
        });
        let data: unknown;
        try { data = await res.json(); } catch { data = null; }
        return { status: res.status(), data, ok: res.ok() };
      },
    };
  }

  // Data helpers
  async getPipelineId(): Promise<string> {
    const res = await this.asAdmin().get("/api/pipelines");
    const pipelines = (res.data as { success: boolean; data: { id: string }[] }).data;
    return pipelines[0].id;
  }

  async getStageId(stageName: string): Promise<string> {
    const pipelineId = await this.getPipelineId();
    const res = await this.asAdmin().get(`/api/stages?pipelineId=${pipelineId}`);
    const stages = res.data as { id: string; name: string }[];
    const stage = stages.find((s) => s.name === stageName);
    if (!stage) throw new Error(`Stage "${stageName}" not found`);
    return stage.id;
  }

  async getLeadInStage(stageName: string): Promise<{ id: string; name: string; stageId: string }> {
    const pipelineId = await this.getPipelineId();
    const stageId = await this.getStageId(stageName);
    const res = await this.asAdmin().get(`/api/leads?pipelineId=${pipelineId}&stageId=${stageId}&limit=1`);
    const data = res.data as { leads: { id: string; name: string; stageId: string }[] };
    if (!data.leads[0]) throw new Error(`No lead found in stage "${stageName}"`);
    return data.leads[0];
  }

  async createTestLead(overrides?: Record<string, string>): Promise<{ id: string; name: string }> {
    const pipelineId = await this.getPipelineId();
    const res = await this.asAdmin().post("/api/leads", {
      name: `Test Lead ${Date.now()}`,
      phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      pipelineId,
      ...overrides,
    });
    return res.data as { id: string; name: string };
  }
}

// Extended test fixture
export const test = base.extend<{ api: ApiHelper }>({
  api: async ({ request }, use) => {
    const helper = new ApiHelper(request);
    await use(helper);
  },
});

export { expect } from "@playwright/test";
