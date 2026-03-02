export type LeadSource = "meta_ads" | "manual" | "website" | "referral";
export type MessageChannel = "whatsapp" | "sms";
export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";
export type MessageDirection = "outbound" | "inbound";

export interface LeadFilters {
  search?: string;
  stageId?: string;
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
