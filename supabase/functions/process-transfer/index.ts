import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { recipient_account_number, amount, description, sender_name } = await req.json();
    if (!recipient_account_number || !amount) throw new Error("Missing required fields");

    // Find recipient account using service role (bypasses RLS)
    const { data: recipientAcc, error: findErr } = await adminClient
      .from("accounts")
      .select("id, user_id, balance")
      .eq("account_number", recipient_account_number)
      .single();

    if (findErr || !recipientAcc) throw new Error("Recipient account not found");

    // Insert credit transaction for recipient
    await adminClient.from("transactions").insert({
      account_id: recipientAcc.id,
      user_id: recipientAcc.user_id,
      type: "credit",
      amount,
      description: description || "Money Transfer",
      status: "completed",
      recipient: sender_name || "Someone",
    });

    // Update recipient balance
    await adminClient.from("accounts").update({
      balance: Number(recipientAcc.balance) + Number(amount),
    }).eq("id", recipientAcc.id);

    // Get recipient email for notification
    const { data: recipientProfile } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", recipientAcc.user_id)
      .single();

    // Trigger credit email to recipient
    if (recipientProfile?.email) {
      const triggerUrl = `${supabaseUrl}/functions/v1/trigger-email`;
      await fetch(triggerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          trigger_type: "credit",
          recipient_email: recipientProfile.email,
          variables: {
            account_name: recipientProfile.full_name || "Account holder",
            amount: Number(amount).toFixed(2),
            sender: sender_name || "Someone",
            transaction_id: "N/A",
            description: description || "Money Transfer",
            account_number: recipient_account_number,
            transaction_type: "credit",
          },
        }),
      }).catch(() => {});
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
