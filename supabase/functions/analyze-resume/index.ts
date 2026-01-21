import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, targetRole } = await req.json();

    if (!resumeText) {
      return new Response(
        JSON.stringify({ error: 'Resume text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert resume reviewer and career coach. Analyze the provided resume and give comprehensive, actionable feedback.

Your analysis should include:

1. **Overall Score** (0-100): A numerical rating of the resume quality
2. **Summary**: A brief 2-3 sentence overall assessment
3. **Strengths**: List 3-5 things the resume does well
4. **Areas for Improvement**: List 3-5 specific things to improve
5. **ATS Compatibility**: Assessment of how well the resume will perform with Applicant Tracking Systems
6. **Content Analysis**:
   - Are achievements quantified with metrics?
   - Is the language action-oriented?
   - Are skills properly highlighted?
7. **Format & Structure**: Comments on layout, readability, and organization
8. **Recommendations**: 3-5 specific, actionable recommendations to improve the resume

${targetRole ? `The candidate is targeting: ${targetRole}. Tailor your feedback accordingly.` : ''}

Format your response as a JSON object with the following structure:
{
  "score": number,
  "summary": string,
  "strengths": string[],
  "improvements": string[],
  "atsScore": number,
  "atsNotes": string,
  "contentAnalysis": {
    "quantifiedAchievements": boolean,
    "actionOriented": boolean,
    "skillsHighlighted": boolean,
    "notes": string
  },
  "formatNotes": string,
  "recommendations": string[]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please analyze this resume:\n\n${resumeText}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON from the response
    let analysis;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      // Return a structured error with the raw content for debugging
      analysis = {
        score: 0,
        summary: "Unable to parse analysis. Please try again.",
        strengths: [],
        improvements: [],
        atsScore: 0,
        atsNotes: "",
        contentAnalysis: {
          quantifiedAchievements: false,
          actionOriented: false,
          skillsHighlighted: false,
          notes: ""
        },
        formatNotes: "",
        recommendations: [],
        rawResponse: content
      };
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-resume function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
