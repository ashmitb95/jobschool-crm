import type { TemplateVariables } from "@/types";

// Bundled email templates — embedded at build time so they work on Vercel serverless
const BUNDLED_TEMPLATES: Record<string, string> = {
  "welcome.html": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0eb;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr>
<td style="background-color:#1a1510;padding:28px 32px;text-align:center;">
  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">LeadLynx</h1>
</td>
</tr>
<tr>
<td style="padding:40px 32px 32px;">
  <h2 style="margin:0 0 16px;color:#1a1510;font-size:22px;font-weight:600;">Welcome, {{name}}!</h2>
  <p style="margin:0 0 16px;color:#4a4540;font-size:15px;line-height:1.6;">
    We're excited to have you on board. Our team is here to help you on your career journey.
  </p>
  <p style="margin:0 0 24px;color:#4a4540;font-size:15px;line-height:1.6;">
    Here's what happens next:
  </p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:12px 16px;background-color:#fef7f3;border-left:3px solid #e8622a;border-radius:0 6px 6px 0;margin-bottom:8px;">
        <p style="margin:0;color:#1a1510;font-size:14px;line-height:1.5;">
          <strong style="color:#e8622a;">Step 1:</strong> A counselor will review your profile<br>
          <strong style="color:#e8622a;">Step 2:</strong> We'll reach out to discuss your goals<br>
          <strong style="color:#e8622a;">Step 3:</strong> Get matched with the right opportunities
        </p>
      </td>
    </tr>
  </table>
</td>
</tr>
<tr>
<td style="padding:0 32px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f6f3;border-radius:6px;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0 0 4px;color:#7a756e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Your details on file</p>
        <p style="margin:0;color:#4a4540;font-size:14px;line-height:1.6;">
          {{name}} &middot; {{phone}}<br>
          {{email}}
        </p>
      </td>
    </tr>
  </table>
</td>
</tr>
<tr>
<td style="padding:0 32px 40px;text-align:center;">
  <a href="{{cv_link}}" style="display:inline-block;background-color:#e8622a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600;">
    Optimize Your CV
  </a>
</td>
</tr>
<tr>
<td style="background-color:#f9f6f3;padding:24px 32px;border-top:1px solid #ebe6e0;">
  <p style="margin:0;color:#9a958e;font-size:12px;line-height:1.5;text-align:center;">
    You're receiving this because you signed up with LeadLynx.<br>
    <a href="#" style="color:#9a958e;text-decoration:underline;">Unsubscribe</a>
  </p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`,

  "stage-update.html": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Stage Update</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0eb;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr>
<td style="background-color:#1a1510;padding:28px 32px;text-align:center;">
  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">LeadLynx</h1>
</td>
</tr>
<tr>
<td style="padding:40px 32px 32px;">
  <h2 style="margin:0 0 16px;color:#1a1510;font-size:22px;font-weight:600;">Hi {{name}}, here's an update</h2>
  <p style="margin:0 0 24px;color:#4a4540;font-size:15px;line-height:1.6;">
    Your application status has been updated. Here's where things stand:
  </p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:20px 24px;background-color:#fef7f3;border-radius:8px;border:1px solid #f5e6dc;text-align:center;">
        <p style="margin:0 0 4px;color:#7a756e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Current Stage</p>
        <p style="margin:0;color:#e8622a;font-size:20px;font-weight:700;">{{stage}}</p>
      </td>
    </tr>
  </table>
</td>
</tr>
<tr>
<td style="padding:0 32px 32px;">
  <p style="margin:0 0 16px;color:#4a4540;font-size:15px;line-height:1.6;">
    Our team is actively working on your profile. We'll keep you posted as things progress.
    If you have any questions, feel free to reply to this email.
  </p>
</td>
</tr>
<tr>
<td style="padding:0 32px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f6f3;border-radius:6px;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0 0 4px;color:#7a756e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Your details</p>
        <p style="margin:0;color:#4a4540;font-size:14px;line-height:1.6;">
          {{name}} &middot; {{phone}}<br>
          {{email}}
        </p>
      </td>
    </tr>
  </table>
</td>
</tr>
<tr>
<td style="padding:0 32px 40px;text-align:center;">
  <a href="{{cv_link}}" style="display:inline-block;background-color:#e8622a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600;">
    Update Your CV
  </a>
</td>
</tr>
<tr>
<td style="background-color:#f9f6f3;padding:24px 32px;border-top:1px solid #ebe6e0;">
  <p style="margin:0;color:#9a958e;font-size:12px;line-height:1.5;text-align:center;">
    You're receiving this because you're registered with LeadLynx.<br>
    <a href="#" style="color:#9a958e;text-decoration:underline;">Unsubscribe</a>
  </p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`,
};

export function readTemplate(filename: string): string {
  const html = BUNDLED_TEMPLATES[filename];
  if (!html) throw new Error(`Email template not found: ${filename}`);
  return html;
}

export function renderEmail(filename: string, variables: TemplateVariables): string {
  const html = readTemplate(filename);
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] || `{{${key}}}`;
  });
}

export function listAvailableTemplates(): string[] {
  return Object.keys(BUNDLED_TEMPLATES);
}

export function extractVariables(html: string): string[] {
  const matches = html.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}
