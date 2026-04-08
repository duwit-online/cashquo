import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_KEYS = [
  "notification_sound_url",
  "topup_account_name",
  "topup_bank_name",
  "topup_account_type",
  "topup_account_number",
  "topup_routing_ach",
  "topup_routing_wire",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await adminClient
      .from("app_settings")
      .select("key, value")
      .in("key", ALLOWED_KEYS);

    if (error) {
      throw new Error(error.message);
    }

    const config = Object.fromEntries((data ?? []).map((item) => [item.key, item.value]));

    return new Response(JSON.stringify({ config }), {
      headers: { ...corsHeaders, "Cache-Control": "no-store", "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});