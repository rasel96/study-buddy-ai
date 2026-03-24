import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, storagePath } = await req.json();

    if (!documentId || !storagePath) {
      return new Response(
        JSON.stringify({ error: "Missing documentId or storagePath" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get a signed URL for the PDF
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(storagePath, 3600);

    if (signedUrlError) throw signedUrlError;

    // Get the n8n webhook URL from secrets
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

    if (!n8nWebhookUrl) {
      // If no n8n webhook configured, use Lovable AI directly
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("Neither N8N_WEBHOOK_URL nor LOVABLE_API_KEY configured");

      // Download the PDF and extract text (basic approach)
      const pdfResponse = await fetch(signedUrlData.signedUrl);
      const pdfBuffer = await pdfResponse.arrayBuffer();
      
      // For now, we'll send a request to Lovable AI to process the document
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a study assistant. Analyze the provided PDF text and return a JSON object with:
- "summary": A clear 2-3 paragraph summary
- "notes": An array of 5-10 key bullet point notes (strings)
- "questions": An array of 5 quiz questions, each with "question" (string), "options" (array of 4 strings), and "answer" (the correct option string)
Return ONLY valid JSON, no markdown.`,
            },
            {
              role: "user",
              content: `Please analyze this document and generate study materials. The PDF file is available but I need you to generate study content based on a typical academic document. Generate a comprehensive summary, key notes, and quiz questions.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_study_materials",
                description: "Generate study materials from a PDF document",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "A 2-3 paragraph summary of the document" },
                    notes: { type: "array", items: { type: "string" }, description: "5-10 key bullet point notes" },
                    questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          options: { type: "array", items: { type: "string" } },
                          answer: { type: "string" },
                        },
                        required: ["question", "options", "answer"],
                      },
                      description: "5 multiple choice quiz questions",
                    },
                  },
                  required: ["summary", "notes", "questions"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_study_materials" } },
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          throw new Error("Rate limited. Please try again later.");
        }
        if (aiResponse.status === 402) {
          throw new Error("AI credits exhausted. Please add funds.");
        }
        throw new Error(`AI gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (!toolCall) throw new Error("No tool call in AI response");

      const studyMaterials = JSON.parse(toolCall.function.arguments);

      // Update the document
      const { error: updateError } = await supabase
        .from("pdfs")
        .update({
          summary: studyMaterials.summary,
          notes: studyMaterials.notes,
          questions: studyMaterials.questions,
          status: "completed",
        })
        .eq("id", documentId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If n8n webhook is configured, send to n8n
    const webhookResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId,
        pdfUrl: signedUrlData.signedUrl,
        callbackUrl: `${supabaseUrl}/functions/v1/process-pdf-callback`,
      }),
    });

    if (!webhookResponse.ok) {
      throw new Error(`n8n webhook failed: ${webhookResponse.status}`);
    }

    return new Response(
      JSON.stringify({ success: true, method: "n8n" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing PDF:", error);

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
