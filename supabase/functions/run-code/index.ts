import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, testCases, problemDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a code execution simulator and judge, similar to LeetCode or CodeChef's online judge. 

Given user code, the programming language, a problem description, and test cases, you must:
1. Analyze the code for syntax errors and compilation issues
2. Mentally trace through each test case to determine if the code produces the correct output
3. Report results for each test case

IMPORTANT RULES:
- Be accurate. Trace through the code step by step for each test case.
- If there are syntax/compilation errors, report them immediately without running test cases.
- For runtime errors (e.g. index out of bounds, null pointer), report them on the specific test case.
- Match output format exactly when comparing.

Return ONLY valid JSON in this exact format:
{
  "compiled": true/false,
  "compilationError": "error message if compilation failed, null otherwise",
  "testResults": [
    {
      "testCaseId": 1,
      "input": "the input",
      "expectedOutput": "expected",
      "actualOutput": "what the code would produce",
      "passed": true/false,
      "error": "runtime error if any, null otherwise"
    }
  ],
  "summary": "Brief summary of results",
  "suggestions": ["improvement suggestion 1", "suggestion 2"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Language: ${language}

Problem Description:
${problemDescription}

User's Code:
\`\`\`${language}
${code}
\`\`\`

Test Cases:
${JSON.stringify(testCases, null, 2)}

Analyze the code and run it against all test cases. Return the JSON result.`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse result from AI");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error running code:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
