import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { loadEmailSettings, sendConfiguredEmail } from "../_shared/email-provider.ts";
import { renderBrandedEmail, escapeHtml } from "../_shared/branded-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, amount, sender_name, recipient_email } = await req.json();
    if (!user_id || !amount || !recipient_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = await loadEmailSettings(adminClient);
    if ((config.email_provider || "none") === "none") {
      return new Response(JSON.stringify({ error: "No email provider configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formatted = Number(amount).toFixed(2);
    const subject = `You received $${formatted} from ${sender_name || "someone"}`;
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const bodyHtml = `
      <div style="text-align:center;margin:0 0 22px">
        <div style="display:inline-block;background:#ecfdf5;color:#047857;padding:14px 26px;border-radius:14px;font-size:28px;font-weight:700;border:1px solid #a7f3d0">
          + $${formatted}
        </div>
      </div>
      <p style="margin:0 0 18px;text-align:center;color:#475569;font-size:15px;line-height:1.6">
        <strong style="color:#0a2540">${escapeHtml(sender_name || "Someone")}</strong> just sent you funds. The amount is now available in your Fidelity CashQuora account.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:6px 14px;font-size:14px;color:#0f172a">
        <tr><td style="padding:10px 6px;color:#64748b">From</td><td style="padding:10px 6px;text-align:right;font-weight:600">${escapeHtml(sender_name || "N/A")}</td></tr>
        <tr><td style="padding:10px 6px;color:#64748b">Amount</td><td style="padding:10px 6px;text-align:right;font-weight:700;color:#047857">$${formatted}</td></tr>
        <tr><td style="padding:10px 6px;color:#64748b">Date</td><td style="padding:10px 6px;text-align:right">${dateStr}</td></tr>
      </table>`;

    const html = renderBrandedEmail({
      title: "Money received",
      preheader: subject,
      bodyHtml,
      footerNote: "If you did not expect this transfer, contact our support team immediately.",
    });

    const emailResult = await sendConfiguredEmail(config, { to: recipient_email, subject, html });
    return new Response(JSON.stringify({ success: true, result: emailResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
