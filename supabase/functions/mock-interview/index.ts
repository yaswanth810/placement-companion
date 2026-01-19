import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, interviewType, targetRole, difficulty, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    
    if (action === "start") {
      systemPrompt = `You are an experienced ${interviewType} interviewer at a top tech company, conducting an interview for a ${targetRole || 'software engineer'} position. This is a ${difficulty} level interview.

Your role:
- Start with a brief, friendly introduction
- Ask one question at a time
- Wait for the candidate's response before asking the next question
- Be encouraging but also challenging
- For technical interviews: Ask about data structures, algorithms, system design, and coding concepts
- For HR interviews: Ask about experiences, strengths, weaknesses, career goals
- For behavioral interviews: Use STAR method questions about past experiences

Start the interview now with a greeting and your first question.`;
    } else if (action === "continue") {
      systemPrompt = `You are an experienced ${interviewType} interviewer at a top tech company, conducting an interview for a ${targetRole || 'software engineer'} position. This is a ${difficulty} level interview.

Guidelines for your response:
- Acknowledge the candidate's answer briefly (good points or areas to improve)
- Ask a follow-up question OR move to a new topic
- Keep the conversation natural and professional
- After 5-7 questions, you can wrap up the interview

If the candidate says they want to end the interview, provide a summary of their performance.`;
    } else if (action === "feedback") {
      systemPrompt = `You are an experienced ${interviewType} interviewer. Based on the interview conversation, provide detailed feedback.

Return ONLY valid JSON in this exact format:
{
  "overallRating": 7.5,
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "improvements": ["Area to improve 1", "Area to improve 2"],
  "questionFeedback": [
    {"question": "Question asked", "rating": 8, "feedback": "Brief feedback on answer"}
  ],
  "tips": ["Tip 1 for future interviews", "Tip 2"],
  "summary": "Overall summary of the interview performance in 2-3 sentences"
}

Rate on a scale of 1-10. Be constructive and helpful.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: action === "feedback" ? 0.3 : 0.7,
        stream: action !== "feedback",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    if (action === "feedback") {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse feedback from AI response");
      }
      return new Response(jsonMatch[0], {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the response for interview conversation
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error: unknown) {
    console.error("Error in mock interview:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
