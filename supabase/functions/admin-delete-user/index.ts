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

    // Verify caller is admin
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

    if (!roleData) throw new Error("Not authorized - admin role required");

    const body = await req.json();
    const user_id = body.user_id;
    if (!user_id) throw new Error("user_id required");

    console.log(`Deleting user ${user_id}...`);

    // Delete from public tables first (order matters for foreign keys)
    await adminClient.from("email_logs").delete().eq("recipient_email", 
      (await adminClient.from("profiles").select("email").eq("user_id", user_id).single()).data?.email || ""
    );
    await adminClient.from("notifications").delete().eq("user_id", user_id);
    await adminClient.from("transactions").delete().eq("user_id", user_id);
    await adminClient.from("accounts").delete().eq("user_id", user_id);
    await adminClient.from("user_roles").delete().eq("user_id", user_id);
    await adminClient.from("profiles").delete().eq("user_id", user_id);

    // Hard delete from auth.users
    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error) {
      console.error("Auth delete error:", error);
      throw new Error(`Failed to delete from auth: ${error.message}`);
    }

    console.log(`User ${user_id} permanently deleted`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete user error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
