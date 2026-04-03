import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { trigger_type, variables, recipient_email } = await req.json();

    if (!trigger_type || !recipient_email) {
      return new Response(JSON.stringify({ error: "trigger_type and recipient_email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find active template for this trigger type
    const { data: template } = await adminClient
      .from("email_templates")
      .select("*")
      .eq("trigger_type", trigger_type)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!template) {
      return new Response(JSON.stringify({ error: "No active template for trigger: " + trigger_type }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get email config
    const { data: settings } = await adminClient
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "email_provider", "smtp_host", "smtp_port", "smtp_user", "smtp_password",
        "smtp_from_email", "smtp_from_name", "resend_api_key",
      ]);

    const config: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => { config[s.key] = s.value; });

    const provider = config.email_provider || "none";
    if (provider === "none") {
      // Log as skipped
      await adminClient.from("email_logs").insert({
        recipient_email,
        trigger_type,
        template_id: template.id,
        status: "skipped",
        error_message: "No email provider configured",
      });
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Replace variables in subject and body
    const vars: Record<string, string> = {
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      year: String(new Date().getFullYear()),
      email: recipient_email,
      ...variables,
    };

    let subject = template.subject;
    let html = template.html_body;
    for (const [key, value] of Object.entries(vars)) {
      const re = new RegExp(`\\{${key}\\}`, "g");
      subject = subject.replace(re, value || "");
      html = html.replace(re, value || "");
    }

    // Send email
    let success = false;
    let errorMessage = "";

    try {
      if (provider === "resend") {
        const resendKey = config.resend_api_key;
        if (!resendKey) throw new Error("Resend API key not configured");

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: `${config.smtp_from_name || "CashQuora"} <${config.smtp_from_email || "noreply@cashquora.com"}>`,
            to: [recipient_email],
            subject,
            html,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(result));
        success = true;
      } else if (provider === "smtp") {
        const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
        const client = new SMTPClient({
          connection: {
            hostname: config.smtp_host,
            port: Number(config.smtp_port) || 587,
            tls: true,
            auth: { username: config.smtp_user, password: config.smtp_password },
          },
        });
        await client.send({
          from: `${config.smtp_from_name || "CashQuora"} <${config.smtp_from_email}>`,
          to: recipient_email,
          subject,
          content: "auto",
          html,
        });
        await client.close();
        success = true;
      }
    } catch (e: unknown) {
      errorMessage = e instanceof Error ? e.message : "Send failed";
    }

    // Log
    await adminClient.from("email_logs").insert({
      recipient_email,
      trigger_type,
      template_id: template.id,
      status: success ? "sent" : "failed",
      error_message: errorMessage || null,
    });

    return new Response(JSON.stringify({ success, error: errorMessage || undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("trigger-email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
