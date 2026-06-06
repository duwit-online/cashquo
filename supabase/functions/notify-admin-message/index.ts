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
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { name, email, phone, subject, message } = body || {};
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "name, email, message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRoles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const ids = (adminRoles ?? []).map((r: any) => r.user_id);
    if (!ids.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profs } = await admin.from("profiles").select("email").in("user_id", ids);
    const recipients = Array.from(new Set((profs ?? []).map((p: any) => p.email).filter(Boolean)));
    if (!recipients.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no admin emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const settings = await loadEmailSettings(admin);
    if (!settings || settings.email_provider === "none") {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "email disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyHtml = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;background:#f8fafc;border-radius:10px;padding:6px 12px">
        <tr><td style="padding:8px 6px;color:#64748b;width:100px">Name</td><td style="padding:8px 6px;font-weight:600;color:#0a2540">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:8px 6px;color:#64748b">Email</td><td style="padding:8px 6px"><a href="mailto:${escapeHtml(email)}" style="color:#0ea5e9;text-decoration:none">${escapeHtml(email)}</a></td></tr>
        ${phone ? `<tr><td style="padding:8px 6px;color:#64748b">Phone</td><td style="padding:8px 6px">${escapeHtml(phone)}</td></tr>` : ""}
        ${subject ? `<tr><td style="padding:8px 6px;color:#64748b">Subject</td><td style="padding:8px 6px">${escapeHtml(subject)}</td></tr>` : ""}
      </table>
      <div style="margin-top:18px;padding:16px 18px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;white-space:pre-wrap;font-size:14px;color:#0f172a;line-height:1.6">${escapeHtml(message)}</div>`;

    const html = renderBrandedEmail({
      title: "New contact form submission",
      preheader: `New message from ${name}`,
      intro: "A visitor has submitted the contact form on Fidelity CashQuora.",
      bodyHtml,
      footerNote: "Open the Admin → Messages tab to manage this submission.",
    });

    let sent = 0;
    const errors: string[] = [];
    for (const to of recipients) {
      try {
        await sendConfiguredEmail(settings, {
          to, subject: `[Contact] ${subject || "New message from " + name}`, html,
        });
        sent++;
      } catch (e) {
        errors.push(`${to}: ${(e as Error).message}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
