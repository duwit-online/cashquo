import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { loadEmailSettings, sendConfiguredEmail } from "../_shared/email-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: role } = await admin
      .from("user_roles").select("role")
      .eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Not authorized");

    const body = await req.json();
    const { mode, recipients, user_ids, subject, html } = body || {};
    if (!subject || !html) throw new Error("subject and html required");

    // Resolve recipient list
    let targets: string[] = [];
    if (mode === "all") {
      const { data } = await admin.from("profiles").select("email");
      targets = (data ?? []).map((p: any) => p.email).filter(Boolean);
    } else if (mode === "users" && Array.isArray(user_ids) && user_ids.length) {
      const { data } = await admin.from("profiles").select("email").in("user_id", user_ids);
      targets = (data ?? []).map((p: any) => p.email).filter(Boolean);
    } else if (mode === "custom" && Array.isArray(recipients)) {
      targets = recipients.filter((e: any) => typeof e === "string" && e.includes("@"));
    } else {
      throw new Error("Invalid recipient mode");
    }
    targets = Array.from(new Set(targets));
    if (!targets.length) throw new Error("No recipients resolved");

    const settings = await loadEmailSettings(admin);
    if ((settings.email_provider || "none") === "none") {
      throw new Error("No email provider configured. Set SMTP or Resend in admin settings.");
    }

    let sent = 0;
    const errors: { to: string; error: string }[] = [];
    for (const to of targets) {
      try {
        await sendConfiguredEmail(settings, { to, subject, html });
        sent++;
        await admin.from("email_logs").insert({
          recipient_email: to, trigger_type: "signup", status: "sent",
        });
      } catch (e) {
        const msg = (e as Error).message;
        errors.push({ to, error: msg });
        await admin.from("email_logs").insert({
          recipient_email: to, trigger_type: "signup", status: "failed", error_message: msg,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed: errors.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
