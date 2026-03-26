import type { OrgSettings } from "@/types";
import type { ChannelProvider, SendParams, SendResult } from "./types";

const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0";

function getCredentials(orgSettings?: OrgSettings) {
  const phoneNumberId = orgSettings?.whatsapp?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = orgSettings?.whatsapp?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  return { phoneNumberId, accessToken };
}

export async function sendTextMessage(
  phone: string,
  body: string,
  orgSettings?: OrgSettings
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { phoneNumberId, accessToken } = getCredentials(orgSettings);
  if (!phoneNumberId || !accessToken) {
    console.log(`[DEV] WhatsApp message to ${phone}:\n${body}`);
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "text",
        text: { body },
      }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error?.message || "Send failed" };
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function sendMediaMessage(
  phone: string,
  body: string,
  mediaUrl: string,
  orgSettings?: OrgSettings
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { phoneNumberId, accessToken } = getCredentials(orgSettings);
  if (!phoneNumberId || !accessToken) {
    console.log(`[DEV] WhatsApp media message to ${phone}:\n${body}\nMedia: ${mediaUrl}`);
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "document",
        document: { link: mediaUrl, caption: body },
      }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error?.message || "Send failed" };
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  languageCode: string = "en",
  bodyParams: string[] = [],
  orgSettings?: OrgSettings
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { phoneNumberId, accessToken } = getCredentials(orgSettings);
  if (!phoneNumberId || !accessToken) {
    console.log(`[DEV] WhatsApp template message to ${phone}:\n  Template: ${templateName} (${languageCode})\n  Params: ${JSON.stringify(bodyParams)}`);
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const components: Array<{ type: string; parameters: Array<{ type: string; text: string }> }> = [];
    if (bodyParams.length > 0) {
      components.push({
        type: "body",
        parameters: bodyParams.map((text) => ({ type: "text", text })),
      });
    }

    const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components.length > 0 ? { components } : {}),
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error?.message || "Template send failed" };
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const APP_SECRET = process.env.META_APP_SECRET;
  if (!APP_SECRET) return true;
  const crypto = require("crypto");
  const expectedSig = crypto.createHmac("sha256", APP_SECRET).update(payload).digest("hex");
  return `sha256=${expectedSig}` === signature;
}

// ChannelProvider interface implementation
const whatsappProvider: ChannelProvider = {
  name: "whatsapp",

  isConfigured(orgSettings?: OrgSettings): boolean {
    const { phoneNumberId, accessToken } = getCredentials(orgSettings);
    return !!(phoneNumberId && accessToken);
  },

  async send(params: SendParams, orgSettings?: OrgSettings): Promise<SendResult> {
    let result: { success: boolean; messageId?: string; error?: string };

    if (params.templateName) {
      result = await sendTemplateMessage(
        params.to,
        params.templateName,
        params.templateLanguage || "en",
        params.templateParams || [],
        orgSettings
      );
    } else if (params.attachmentUrl) {
      result = await sendMediaMessage(params.to, params.body, params.attachmentUrl, orgSettings);
    } else {
      result = await sendTextMessage(params.to, params.body, orgSettings);
    }

    return {
      success: result.success,
      externalId: result.messageId,
      error: result.error,
    };
  },
};

export default whatsappProvider;
