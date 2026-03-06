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
    const { topic, difficulty, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert DSA (Data Structures & Algorithms) instructor specializing in placement preparation. You guide students from beginner to advanced level.

Given a DSA topic, difficulty level, and programming language, generate a comprehensive learning module with:

1. **Concept Explanation**: A clear, beginner-friendly explanation of the topic with key points, time/space complexity, and when to use it. Use markdown formatting.

2. **MCQ Questions**: Generate exactly 4 multiple-choice questions to test conceptual understanding of the topic. Each should have 4 options with one correct answer and an explanation.

3. **Coding Challenges**: Generate exactly 3 coding problems of increasing difficulty (easy → medium → hard) related to the topic. Each should have:
   - A clear problem statement
   - Input/output examples
   - Starter code template in the specified language
   - A complete solution in the specified language
   - Hints

Return ONLY valid JSON in this exact format:
{
  "explanation": "# Topic Name\\n\\nMarkdown explanation here with examples, complexity analysis, key concepts...",
  "mcqs": [
    {
      "id": 1,
      "question": "Question text?",
      "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
      "correctAnswer": "A",
      "explanation": "Why A is correct"
    }
  ],
  "codingChallenges": [
    {
      "id": 1,
      "title": "Problem Title",
      "difficulty": "easy",
      "description": "Full problem statement with examples",
      "examples": [
        { "input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] = 9" }
      ],
      "starterCode": "code template here",
      "solution": "complete solution here",
      "hints": ["Hint 1", "Hint 2"]
    }
  ]
}`;

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
          {
            role: "user",
            content: `Generate a complete learning module for the DSA topic: "${topic}" at "${difficulty}" difficulty level. The coding language should be "${language}". Make the explanation thorough with real-world analogies and the coding challenges progressively harder.`,
          },
        ],
        temperature: 0.7,
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse content from AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error generating DSA content:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
