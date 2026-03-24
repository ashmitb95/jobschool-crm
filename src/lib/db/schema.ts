import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ─── Multi-Tenant & RBAC Tables ─────────────────────────────────────────────

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  settings: text("settings"), // JSON: { timezone, defaultPipelineId, branding }
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  username: text("username").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("member"), // "super_admin" | "admin" | "member"
  orgId: text("org_id").references(() => organizations.id), // NULL for super_admin
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const pipelines = sqliteTable("pipelines", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  description: text("description"),
  orgId: text("org_id").notNull().references(() => organizations.id),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const userPipelines = sqliteTable("user_pipelines", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pipelineId: text("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Audit & Activity Tables ────────────────────────────────────────────────

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").references(() => users.id),
  orgId: text("org_id").references(() => organizations.id),
  action: text("action").notNull(), // "lead.created", "stage.moved", etc.
  entityType: text("entity_type").notNull(), // "lead", "stage", "pipeline", "user"
  entityId: text("entity_id"),
  metadata: text("metadata"), // JSON
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const leadActivities = sqliteTable("lead_activities", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(), // "stage_changed", "note_added", "message_sent", "field_updated"
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Core Business Tables ───────────────────────────────────────────────────

export const stages = sqliteTable("stages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  color: text("color").notNull().default("#6b7280"),
  templateId: text("template_id").references(() => messageTemplates.id),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  pipelineId: text("pipeline_id").references(() => pipelines.id, { onDelete: "cascade" }),
  workflowX: integer("workflow_x"),
  workflowY: integer("workflow_y"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const messageTemplates = sqliteTable("message_templates", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  body: text("body").notNull(),
  channel: text("channel").notNull().default("whatsapp"),
  attachmentUrl: text("attachment_url"),
  waTemplateName: text("wa_template_name"),
  waTemplateLanguage: text("wa_template_language").default("en"),
  orgId: text("org_id").references(() => organizations.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  source: text("source").notNull().default("manual"),
  sourceAdId: text("source_ad_id"),
  stageId: text("stage_id").notNull().references(() => stages.id),
  pipelineId: text("pipeline_id").references(() => pipelines.id, { onDelete: "cascade" }),
  notes: text("notes"),
  metadata: text("metadata"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  templateId: text("template_id").references(() => messageTemplates.id),
  channel: text("channel").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  direction: text("direction").notNull().default("outbound"),
  externalId: text("external_id"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const candidateProfiles = sqliteTable("candidate_profiles", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  leadId: text("lead_id").notNull().unique(),
  skills: text("skills").notNull().default("[]"),
  domain: text("domain"),
  seniority: text("seniority"),
  targetRoles: text("target_roles").notNull().default("[]"),
  industries: text("industries").notNull().default("[]"),
  cvUrl: text("cv_url"),
  optimizedCvUrl: text("optimized_cv_url"),
  matchScore: real("match_score"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const stageFields = sqliteTable("stage_fields", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  stageId: text("stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fieldKey: text("field_key").notNull(),
  fieldType: text("field_type").notNull(),
  required: integer("required", { mode: "boolean" }).notNull().default(false),
  options: text("options"),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const leadStageData = sqliteTable("lead_stage_data", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  stageId: text("stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
  fieldId: text("field_id").notNull().references(() => stageFields.id, { onDelete: "cascade" }),
  value: text("value"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const stageTransitions = sqliteTable("stage_transitions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  fromStageId: text("from_stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
  toStageId: text("to_stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Meta Integration Tables ────────────────────────────────────────────────

export const metaFormMappings = sqliteTable("meta_form_mappings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  formId: text("form_id").notNull(),
  formName: text("form_name"),
  pipelineId: text("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Relations ──────────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  pipelines: many(pipelines),
  messageTemplates: many(messageTemplates),
  auditLogs: many(auditLogs),
  metaFormMappings: many(metaFormMappings),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
  pipelines: many(userPipelines),
  sessions: many(sessions),
}));

export const pipelinesRelations = relations(pipelines, ({ one, many }) => ({
  organization: one(organizations, { fields: [pipelines.orgId], references: [organizations.id] }),
  stages: many(stages),
  leads: many(leads),
  users: many(userPipelines),
  metaFormMappings: many(metaFormMappings),
}));

export const userPipelinesRelations = relations(userPipelines, ({ one }) => ({
  user: one(users, { fields: [userPipelines.userId], references: [users.id] }),
  pipeline: one(pipelines, { fields: [userPipelines.pipelineId], references: [pipelines.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
  organization: one(organizations, { fields: [auditLogs.orgId], references: [organizations.id] }),
}));

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, { fields: [leadActivities.leadId], references: [leads.id] }),
  user: one(users, { fields: [leadActivities.userId], references: [users.id] }),
}));

export const stagesRelations = relations(stages, ({ one, many }) => ({
  template: one(messageTemplates, { fields: [stages.templateId], references: [messageTemplates.id] }),
  pipeline: one(pipelines, { fields: [stages.pipelineId], references: [pipelines.id] }),
  leads: many(leads),
  fields: many(stageFields),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  stage: one(stages, { fields: [leads.stageId], references: [stages.id] }),
  pipeline: one(pipelines, { fields: [leads.pipelineId], references: [pipelines.id] }),
  messages: many(messages),
  profile: one(candidateProfiles, { fields: [leads.id], references: [candidateProfiles.leadId] }),
  stageData: many(leadStageData),
  activities: many(leadActivities),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  lead: one(leads, { fields: [messages.leadId], references: [leads.id] }),
  template: one(messageTemplates, { fields: [messages.templateId], references: [messageTemplates.id] }),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  organization: one(organizations, { fields: [messageTemplates.orgId], references: [organizations.id] }),
  stage: one(stages, { fields: [messageTemplates.id], references: [stages.templateId] }),
}));

export const candidateProfilesRelations = relations(candidateProfiles, ({ one }) => ({
  lead: one(leads, { fields: [candidateProfiles.leadId], references: [leads.id] }),
}));

export const stageFieldsRelations = relations(stageFields, ({ one, many }) => ({
  stage: one(stages, { fields: [stageFields.stageId], references: [stages.id] }),
  data: many(leadStageData),
}));

export const leadStageDataRelations = relations(leadStageData, ({ one }) => ({
  lead: one(leads, { fields: [leadStageData.leadId], references: [leads.id] }),
  stage: one(stages, { fields: [leadStageData.stageId], references: [stages.id] }),
  field: one(stageFields, { fields: [leadStageData.fieldId], references: [stageFields.id] }),
}));

export const stageTransitionsRelations = relations(stageTransitions, ({ one }) => ({
  fromStage: one(stages, { fields: [stageTransitions.fromStageId], references: [stages.id] }),
  toStage: one(stages, { fields: [stageTransitions.toStageId], references: [stages.id] }),
}));

export const metaFormMappingsRelations = relations(metaFormMappings, ({ one }) => ({
  organization: one(organizations, { fields: [metaFormMappings.orgId], references: [organizations.id] }),
  pipeline: one(pipelines, { fields: [metaFormMappings.pipelineId], references: [pipelines.id] }),
}));
