import type { OrgSettings } from "@/types";

export interface SendParams {
  to: string;            // phone for whatsapp, email address for email
  body: string;          // rendered text (whatsapp) or HTML (email)
  subject?: string;      // email only
  attachmentUrl?: string;
  templateName?: string; // WA approved template name
  templateParams?: string[];
  templateLanguage?: string;
}

export interface SendResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface ChannelProvider {
  name: string;
  isConfigured(orgSettings?: OrgSettings): boolean;
  send(params: SendParams, orgSettings?: OrgSettings): Promise<SendResult>;
}
