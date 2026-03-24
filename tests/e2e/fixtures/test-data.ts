export const BASE_URL = "http://localhost:3001";

export const USERS = {
  superAdmin: { username: "superadmin", password: "superadmin123", role: "super_admin", redirect: "/manage" },
  admin: { username: "admin", password: "admin123", role: "admin", redirect: "/pipeline" },
  member: { username: "member", password: "member123", role: "member", redirect: "/pipeline" },
} as const;

export const ORG = { name: "JobSchool", slug: "jobschool" };
export const PIPELINE = { name: "Default Pipeline" };

export const STAGE_NAMES = ["New Lead", "Contacted", "Interested", "Qualified", "Enrolled", "Lost"] as const;

export const VALID_TRANSITIONS: Record<string, string[]> = {
  "New Lead": ["Contacted", "Lost"],
  "Contacted": ["Interested", "Lost"],
  "Interested": ["Qualified", "Lost"],
  "Qualified": ["Enrolled", "Lost"],
};

export const INVALID_TRANSITIONS: Record<string, string[]> = {
  "New Lead": ["Interested", "Qualified", "Enrolled"],
  "Contacted": ["New Lead", "Qualified", "Enrolled"],
  "Interested": ["New Lead", "Contacted", "Enrolled"],
  "Qualified": ["New Lead", "Contacted", "Interested"],
};

export const REQUIRED_STAGE_FIELDS: Record<string, { key: string; type: string; testValue: string }[]> = {
  "Contacted": [{ key: "contact_method", type: "select", testValue: "WhatsApp" }],
  "Qualified": [{ key: "programme_interest", type: "text", testValue: "Data Science" }],
  "Enrolled": [{ key: "enrollment_date", type: "date", testValue: "2026-04-01" }],
};

export const SEED_LEAD_COUNT = 30;
export const SAMPLE_LEAD = { name: "Test Lead", phone: "+919999999999", source: "manual" };
export const EXISTING_LEAD = { name: "Arjun Mehta", phone: "+919876543210" };
