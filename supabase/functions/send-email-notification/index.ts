import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, amount, sender_name, recipient_email } = await req.json();

    if (!user_id || !amount || !recipient_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get email settings from app_settings
    const { data: settings } = await adminClient
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "email_provider",
        "smtp_host",
        "smtp_port",
        "smtp_user",
        "smtp_password",
        "smtp_from_email",
        "smtp_from_name",
        "resend_api_key",
      ]);

    const config: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      config[s.key] = s.value;
    });

    const provider = config.email_provider || "none";

    if (provider === "none") {
      return new Response(JSON.stringify({ error: "No email provider configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = `You received $${Number(amount).toFixed(2)} from ${sender_name || "someone"}`;
    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">CashQuora</h1>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin-top: 4px;">Secure Digital Banking</p>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #ecfdf5; color: #059669; padding: 12px 24px; border-radius: 12px; font-size: 32px; font-weight: bold;">
              +$${Number(amount).toFixed(2)}
            </div>
          </div>
          <h2 style="font-size: 20px; color: #0f172a; text-align: center; margin-bottom: 8px;">Money Received!</h2>
          <p style="color: #64748b; text-align: center; font-size: 14px; margin-bottom: 24px;">
            ${sender_name || "Someone"} has sent you <strong>$${Number(amount).toFixed(2)}</strong>
          </p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%; font-size: 14px; color: #334155;">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">From</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${sender_name || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Amount</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #059669;">$${Number(amount).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Date</td>
                <td style="padding: 8px 0; text-align: right;">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
              </tr>
            </table>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            This is an automated notification from CashQuora. Do not reply to this email.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} CashQuora. All rights reserved.</p>
        </div>
      </div>
    `;

    let emailResult;

    if (provider === "resend") {
      const resendKey = config.resend_api_key;
      if (!resendKey) {
        return new Response(JSON.stringify({ error: "Resend API key not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
      emailResult = await res.json();

    } else if (provider === "smtp") {
      // For SMTP we use a simple fetch to a nodemailer-compatible approach
      // Since Deno doesn't have native SMTP, we use the Deno smtp module
      const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

      const client = new SMTPClient({
        connection: {
          hostname: config.smtp_host,
          port: Number(config.smtp_port) || 587,
          tls: true,
          auth: {
            username: config.smtp_user,
            password: config.smtp_password,
          },
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
      emailResult = { success: true };
    }

    return new Response(JSON.stringify({ success: true, result: emailResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
