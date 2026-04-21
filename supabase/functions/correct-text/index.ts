const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  text: string;
  mode?: "full" | "word";
  language?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, mode = "full", language }: RequestBody = await req.json();

    if (!text || typeof text !== "string" || text.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Provide 'text' (string, max 5000 chars)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isWord = mode === "word";

    const langHint = language
      ? ` The input language is ${language} — assume this language and do NOT translate.`
      : ` Auto-detect language.`;

    const systemPrompt = isWord
      ? `You are a multilingual spell-checker. Given a single (possibly misspelled) word, return up to 5 most likely intended spellings in the SAME language as the input.${langHint} If the word is already correctly spelled, return it as the only suggestion. Order from most to least likely.`
      : `You are a world-class multilingual proofreading assistant.${langHint} Supported languages include English, Spanish, French, German, Italian, Portuguese, Hindi, Tamil, Telugu, Bengali, and others. Correct ALL spelling, grammar, punctuation, capitalization, and word-choice errors. Preserve the original meaning, tone, formatting, and line breaks. Do NOT translate. Do NOT add commentary.`;

    const tools = isWord
      ? [
          {
            type: "function",
            function: {
              name: "return_suggestions",
              description: "Return spelling suggestions for the input word.",
              parameters: {
                type: "object",
                properties: {
                  language: { type: "string", description: "Detected language name" },
                  suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Up to 5 spelling suggestions, best first.",
                  },
                },
                required: ["language", "suggestions"],
                additionalProperties: false,
              },
            },
          },
        ]
      : [
          {
            type: "function",
            function: {
              name: "return_correction",
              description: "Return the corrected text.",
              parameters: {
                type: "object",
                properties: {
                  language: { type: "string", description: "Detected language name" },
                  corrected: { type: "string", description: "Fully corrected text." },
                  changes: {
                    type: "array",
                    description: "List of changes made.",
                    items: {
                      type: "object",
                      properties: {
                        original: { type: "string" },
                        replacement: { type: "string" },
                        reason: { type: "string" },
                      },
                      required: ["original", "replacement", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["language", "corrected", "changes"],
                additionalProperties: false,
              },
            },
          },
        ];

    const toolName = isWord ? "return_suggestions" : "return_correction";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        tools,
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No correction returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("correct-text error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
