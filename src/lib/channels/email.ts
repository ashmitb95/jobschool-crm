import { Resend } from "resend";
import type { OrgSettings } from "@/types";
import type { ChannelProvider, SendParams, SendResult } from "./types";

function getCredentials(orgSettings?: OrgSettings) {
  const apiKey = orgSettings?.email?.apiKey || process.env.RESEND_API_KEY;
  const fromAddress = orgSettings?.email?.fromAddress || process.env.EMAIL_FROM_ADDRESS || "noreply@leadlynx.io";
  const fromName = orgSettings?.email?.fromName || process.env.EMAIL_FROM_NAME || "LeadLynx";
  return { apiKey, fromAddress, fromName };
}

const emailProvider: ChannelProvider = {
  name: "email",

  isConfigured(orgSettings?: OrgSettings): boolean {
    const { apiKey } = getCredentials(orgSettings);
    return !!apiKey;
  },

  async send(params: SendParams, orgSettings?: OrgSettings): Promise<SendResult> {
    const { apiKey, fromAddress, fromName } = getCredentials(orgSettings);

    if (!apiKey) {
      console.log(`[DEV] Email to ${params.to}:`);
      console.log(`  Subject: ${params.subject || "(no subject)"}`);
      console.log(`  Body: ${params.body.substring(0, 200)}...`);
      return { success: true, externalId: `dev_email_${Date.now()}` };
    }

    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to: [params.to],
        subject: params.subject || "Message from LeadLynx",
        html: params.body,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, externalId: data?.id };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};

export default emailProvider;
