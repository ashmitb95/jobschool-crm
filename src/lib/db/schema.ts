import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const stages = sqliteTable("stages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  color: text("color").notNull().default("#6b7280"),
  templateId: text("template_id").references(() => messageTemplates.id),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
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
  notes: text("notes"),
  metadata: text("metadata"),
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

// Relations
export const stagesRelations = relations(stages, ({ one, many }) => ({
  template: one(messageTemplates, { fields: [stages.templateId], references: [messageTemplates.id] }),
  leads: many(leads),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  stage: one(stages, { fields: [leads.stageId], references: [stages.id] }),
  messages: many(messages),
  profile: one(candidateProfiles, { fields: [leads.id], references: [candidateProfiles.leadId] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  lead: one(leads, { fields: [messages.leadId], references: [leads.id] }),
  template: one(messageTemplates, { fields: [messages.templateId], references: [messageTemplates.id] }),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  stage: one(stages, { fields: [messageTemplates.id], references: [stages.templateId] }),
}));

export const candidateProfilesRelations = relations(candidateProfiles, ({ one }) => ({
  lead: one(leads, { fields: [candidateProfiles.leadId], references: [leads.id] }),
}));
