const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

function isConfigured(): boolean {
  return !!(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

export async function sendTextMessage(phone: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isConfigured()) {
    console.log(`[DEV] WhatsApp message to ${phone}:\n${body}`);
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
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

    if (!res.ok) {
      return { success: false, error: data.error?.message || "Send failed" };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function sendMediaMessage(
  phone: string,
  body: string,
  mediaUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isConfigured()) {
    console.log(`[DEV] WhatsApp media message to ${phone}:\n${body}\nMedia: ${mediaUrl}`);
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "document",
        document: {
          link: mediaUrl,
          caption: body,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error?.message || "Send failed" };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  languageCode: string = "en",
  bodyParams: string[] = []
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isConfigured()) {
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

    const res = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
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

    if (!res.ok) {
      return { success: false, error: data.error?.message || "Template send failed" };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const APP_SECRET = process.env.META_APP_SECRET;
  if (!APP_SECRET) return true; // skip in dev

  const crypto = require("crypto");
  const expectedSig = crypto
    .createHmac("sha256", APP_SECRET)
    .update(payload)
    .digest("hex");

  return `sha256=${expectedSig}` === signature;
}
