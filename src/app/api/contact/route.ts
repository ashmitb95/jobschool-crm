import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const { name, phone, email, company, message } = body as Record<string, string>;

  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ success: false, error: "Name and phone are required" }, { status: 400 });
  }

  const notifyEmail = process.env.DEMO_NOTIFY_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || "noreply@leadlynx.io";

  // Dev / not configured — log and succeed silently
  if (!notifyEmail || !apiKey) {
    console.log("[contact] Demo request received (email not configured):", { name, phone, email, company, message });
    return NextResponse.json({ success: true });
  }

  const rows = [
    ["Name",      name],
    ["Phone",     phone],
    email?.trim()   ? ["Email",   email]   : null,
    company?.trim() ? ["Company", company] : null,
    message?.trim() ? ["Message", `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${message}</pre>`] : null,
    ["Submitted", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
  ].filter(Boolean) as [string, string][];

  const tableRows = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;color:#918a7e;white-space:nowrap;vertical-align:top">${label}</td>
        <td style="padding:8px 12px;color:#ede9e1;font-weight:500">${value}</td>
      </tr>`)
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0c0b09;font-family:sans-serif;">
      <div style="max-width:520px;margin:32px auto;background:#151311;border:1px solid #2a2520;border-radius:16px;overflow:hidden;">
        <div style="padding:24px 28px;border-bottom:1px solid #2a2520;">
          <p style="margin:0;font-size:11px;color:#918a7e;letter-spacing:0.08em;text-transform:uppercase">LeadLynx</p>
          <h1 style="margin:6px 0 0;font-size:20px;color:#ede9e1;">New Demo Request</h1>
        </div>
        <table style="width:100%;border-collapse:collapse;padding:8px 16px;">
          ${tableRows}
        </table>
        <div style="padding:16px 28px;border-top:1px solid #2a2520;">
          <p style="margin:0;font-size:11px;color:#5e5850;">Submitted via leadlynx.io</p>
        </div>
      </div>
    </body>
    </html>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `LeadLynx <${fromAddress}>`,
      to: [notifyEmail],
      subject: `Demo request: ${name} · ${phone}`,
      html,
    });

    if (error) {
      console.error("[contact] Resend error:", error);
      return NextResponse.json({ success: false, error: "Failed to send notification" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact] Unexpected error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
