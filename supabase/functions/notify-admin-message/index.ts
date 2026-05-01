import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { loadEmailSettings, sendConfiguredEmail } from "../_shared/email-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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

    // Get admin emails
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

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
        <h2 style="margin:0 0 12px;color:#0a0a0a">New contact form submission</h2>
        <p style="color:#555;margin:0 0 16px">A visitor has submitted the contact form on Fidelity CashQuora.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#777;width:90px">Name</td><td style="padding:6px 0;font-weight:600">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:6px 0;color:#777">Email</td><td style="padding:6px 0">${escapeHtml(email)}</td></tr>
          ${phone ? `<tr><td style="padding:6px 0;color:#777">Phone</td><td style="padding:6px 0">${escapeHtml(phone)}</td></tr>` : ""}
          ${subject ? `<tr><td style="padding:6px 0;color:#777">Subject</td><td style="padding:6px 0">${escapeHtml(subject)}</td></tr>` : ""}
        </table>
        <div style="margin-top:16px;padding:12px 14px;background:#f5f5f5;border-radius:8px;white-space:pre-wrap;font-size:14px;color:#222">${escapeHtml(message)}</div>
        <p style="margin-top:20px;font-size:12px;color:#888">Open the Admin → Messages tab to manage this submission.</p>
      </div>`;

    let sent = 0;
    const errors: string[] = [];
    for (const to of recipients) {
      try {
        await sendConfiguredEmail(settings, {
          to,
          subject: `[Contact] ${subject || "New message from " + name}`,
          html,
          replyTo: email,
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
