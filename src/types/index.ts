// ─── RBAC & Multi-Tenant Types ──────────────────────────────────────────────

export type UserRole = "super_admin" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: OrgSettings | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgSettings {
  timezone?: string;
  defaultPipelineId?: string;
  branding?: {
    logoUrl?: string;
    accentColor?: string;
  };
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  displayName: string;
  role: UserRole;
  orgId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPipeline {
  id: string;
  userId: string;
  pipelineId: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  orgId: string | null;
}

export interface AuthContext {
  user: AuthUser;
  pipelines: Pipeline[];
  org: Organization | null;
}

// ─── Audit & Activity Types ─────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId: string | null;
  orgId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: string | null;
  createdAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  userId: string | null;
  action: string;
  description: string;
  metadata: string | null;
  createdAt: string;
  user?: { displayName: string } | null;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Business Types ─────────────────────────────────────────────────────────

export type LeadSource = "meta_ads" | "manual" | "website" | "referral";
export type MessageChannel = "whatsapp" | "sms";
export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";
export type MessageDirection = "outbound" | "inbound";

export interface LeadFilters {
  search?: string;
  stageId?: string;
  pipelineId?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: "newest" | "oldest" | "name";
}

export interface TemplateVariables {
  name: string;
  phone: string;
  email?: string;
  stage?: string;
  [key: string]: string | undefined;
}

export type StageFieldType = "text" | "number" | "date" | "select" | "textarea" | "checkbox";

export interface StageField {
  id: string;
  stageId: string;
  name: string;
  fieldKey: string;
  fieldType: StageFieldType;
  required: boolean;
  options: string | null;
  order: number;
}

export interface StageTransition {
  id: string;
  fromStageId: string;
  toStageId: string;
}

export interface LeadStageDataEntry {
  id: string;
  leadId: string;
  stageId: string;
  fieldId: string;
  value: string | null;
  field: StageField;
}

export interface WorkflowStage {
  id: string;
  name: string;
  order: number;
  color: string;
  isDefault: boolean;
  templateId: string | null;
  templateName: string | null;
  fieldCount: number;
  workflowX: number | null;
  workflowY: number | null;
}
