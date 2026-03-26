import { z } from "zod";

// ─── Auth ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

// ─── Users ──────────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dots, hyphens, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  role: z.enum(["admin", "member"]).default("member"),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "member"]).optional(),
});

// ─── Organizations ──────────────────────────────────────────────────────────

export const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  settings: z.object({
    timezone: z.string().optional(),
    defaultPipelineId: z.string().optional(),
    branding: z.object({
      logoUrl: z.string().url().optional(),
      accentColor: z.string().optional(),
    }).optional(),
    meta: z.object({
      pageId: z.string().optional(),
      pageAccessToken: z.string().optional(),
      pageName: z.string().optional(),
    }).optional(),
    whatsapp: z.object({
      phoneNumberId: z.string().optional(),
      accessToken: z.string().optional(),
    }).optional(),
    email: z.object({
      provider: z.enum(["resend", "sendgrid"]).optional(),
      apiKey: z.string().optional(),
      fromAddress: z.string().optional(),
      fromName: z.string().optional(),
    }).optional(),
  }).optional(),
});

// ─── Meta Integration ──────────────────────────────────────────────────────

export const updateMetaConnectionSchema = z.object({
  pageId: z.string().min(1, "Page ID is required"),
  pageAccessToken: z.string().min(1, "Page Access Token is required"),
});

export const updateFormMappingsSchema = z.object({
  mappings: z.array(z.object({
    formId: z.string().min(1),
    formName: z.string().optional(),
    pipelineId: z.string().min(1),
  })),
  migrate: z.boolean().optional(),
});

// ─── Pipelines ──────────────────────────────────────────────────────────────

export const createPipelineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updatePipelineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

// ─── Pipeline Assignments ───────────────────────────────────────────────────

export const updateUserPipelinesSchema = z.object({
  pipelineIds: z.array(z.string()),
});

// ─── Stages ─────────────────────────────────────────────────────────────────

export const createStageSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
  order: z.number().int().optional(),
  pipelineId: z.string().min(1, "Pipeline ID is required"),
});

export const bulkUpdateStagesSchema = z.object({
  stages: z.array(z.object({
    id: z.string(),
    order: z.number().int(),
    name: z.string().optional(),
    color: z.string().optional(),
  })),
});

// ─── Leads ──────────────────────────────────────────────────────────────────

export const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  source: z.enum(["meta_ads", "manual", "website", "referral"]).default("manual"),
  notes: z.string().optional(),
  stageId: z.string().optional(),
  pipelineId: z.string().min(1, "Pipeline ID is required"),
});

export const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

// ─── Stage Transitions ──────────────────────────────────────────────────────

export const moveLeadSchema = z.object({
  stageId: z.string().min(1, "Stage ID is required"),
  fieldValues: z.record(z.string(), z.string()).optional(),
});

// ─── Templates ──────────────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  name: z.string().min(1),
  body: z.string().min(1),
  channel: z.enum(["whatsapp", "email", "sms"]).default("whatsapp"),
  attachmentUrl: z.string().url().optional(),
  waTemplateName: z.string().optional(),
  waTemplateLanguage: z.string().optional(),
  emailTemplateId: z.string().optional(),
  subject: z.string().optional(),
});
