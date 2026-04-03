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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Not authorized");

    const { test_email } = await req.json();
    if (!test_email) throw new Error("test_email required");

    // Get config
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
    if (provider === "none") throw new Error("No email provider configured");

    const subject = "CashQuora SMTP Test";
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px"><h2>SMTP Configuration Test</h2><p>This is a test email from CashQuora. If you received this, your email configuration is working correctly.</p><p style="color:#94a3b8;font-size:12px">Sent at ${new Date().toISOString()}</p></div>`;

    if (provider === "resend") {
      const resendKey = config.resend_api_key;
      if (!resendKey) throw new Error("Resend API key not configured");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: `${config.smtp_from_name || "CashQuora"} <${config.smtp_from_email || "noreply@cashquora.com"}>`,
          to: [test_email],
          subject,
          html,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
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
        to: test_email,
        subject,
        content: "auto",
        html,
      });
      await client.close();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
