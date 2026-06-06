export const BRAND_NAME = "Fidelity CashQuora";
export const BRAND_TAGLINE = "Secure Digital Banking";
export const BRAND_ADDRESS = "345 California St, Ste. 1600, San Francisco CA 94104";
export const BRAND_PHONE = "+1 (628) 262-7372";

export const escapeHtml = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface BrandedEmailOptions {
  title: string;
  preheader?: string;
  intro?: string;
  bodyHtml: string;          // pre-rendered safe HTML for the main content area
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

/**
 * Render any email content inside the official Fidelity CashQuora brand shell.
 * Works in light & dark email clients. Inline styles only.
 */
export const renderBrandedEmail = (opts: BrandedEmailOptions): string => {
  const year = new Date().getFullYear();
  const preheader = opts.preheader ?? opts.title;
  const cta = opts.ctaUrl && opts.ctaLabel
    ? `<div style="text-align:center;margin:28px 0 8px">
         <a href="${opts.ctaUrl}" style="background:linear-gradient(135deg,#0a2540,#0ea5e9);color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:600;font-size:14px;display:inline-block;letter-spacing:0.2px">${escapeHtml(opts.ctaLabel)}</a>
       </div>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(opts.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef2f7;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);border:1px solid #e2e8f0">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a2540 0%,#0b3b6f 60%,#0ea5e9 100%);padding:28px 32px;text-align:left">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="display:inline-block;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.25);padding:6px 12px;border-radius:999px;color:#ffffff;font-size:11px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase">FIDELITY</div>
                    <h1 style="margin:12px 0 4px;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px">${BRAND_NAME}</h1>
                    <p style="margin:0;color:rgba(255,255,255,0.78);font-size:13px">${BRAND_TAGLINE}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px">
              <h2 style="margin:0 0 14px;font-size:20px;color:#0a2540;font-weight:700;letter-spacing:-0.2px">${escapeHtml(opts.title)}</h2>
              ${opts.intro ? `<p style="margin:0 0 18px;color:#475569;font-size:15px;line-height:1.6">${escapeHtml(opts.intro)}</p>` : ""}
              <div style="color:#0f172a;font-size:15px;line-height:1.65">${opts.bodyHtml}</div>
              ${cta}
              ${opts.footerNote ? `<p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6;border-top:1px solid #e2e8f0;padding-top:16px">${escapeHtml(opts.footerNote)}</p>` : ""}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:22px 32px;border-top:1px solid #e2e8f0">
              <p style="margin:0 0 6px;color:#0a2540;font-size:13px;font-weight:600">${BRAND_NAME}</p>
              <p style="margin:0 0 4px;color:#64748b;font-size:12px">${BRAND_ADDRESS}</p>
              <p style="margin:0 0 12px;color:#64748b;font-size:12px">${BRAND_PHONE}</p>
              <p style="margin:0;color:#94a3b8;font-size:11px">© ${year} ${BRAND_NAME}. All rights reserved. This is an automated message — please do not reply.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
};

/** Convert plain text (or already-html) body into a styled block for use inside the brand shell. */
export const toEmailContentHtml = (raw: string): string => {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<")) return trimmed;
  const safe = escapeHtml(trimmed).replace(/\n/g, "<br/>");
  return `<div style="white-space:normal;word-wrap:break-word">${safe}</div>`;
};
