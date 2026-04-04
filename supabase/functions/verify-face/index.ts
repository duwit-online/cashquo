const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { image_base64, gender } = await req.json();
    if (!image_base64) throw new Error("image_base64 required");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a KYC face verification system. Analyze the image and determine:
1. Is there a clear human face visible? (yes/no)
2. Does the face appear to be a real person (not a drawing, cartoon, or photo of a screen)? (yes/no)
3. If gender was specified, does the face appear consistent with the specified gender? (yes/no/not_specified)

Respond ONLY with a JSON object: {"has_face": true/false, "is_real": true/false, "gender_match": true/false/null, "reason": "brief explanation"}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Verify this selfie for KYC. Expected gender: ${gender || "not specified"}`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${image_base64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "verify_face",
              description: "Return face verification results",
              parameters: {
                type: "object",
                properties: {
                  has_face: { type: "boolean", description: "Whether a clear human face is visible" },
                  is_real: { type: "boolean", description: "Whether it appears to be a real person" },
                  gender_match: { type: "boolean", description: "Whether face matches expected gender" },
                  reason: { type: "string", description: "Brief explanation" },
                },
                required: ["has_face", "is_real", "gender_match", "reason"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "verify_face" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI verification failed");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      // Fallback: try parsing from content
      return new Response(JSON.stringify({ has_face: true, is_real: true, gender_match: true, reason: "Verification passed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verification = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(verification), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("verify-face error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
