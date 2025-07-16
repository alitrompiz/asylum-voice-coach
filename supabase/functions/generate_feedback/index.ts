import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, onboarding, personaDesc, skillsSelected } = await req.json();
    
    if (!transcript) {
      throw new Error('Transcript is required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Create comprehensive system prompt for feedback generation
    const systemPrompt = `You are an expert asylum interview evaluator providing constructive feedback to help asylum seekers improve their interview performance.

EVALUATION CRITERIA:
- Clarity and coherence of storytelling
- Emotional authenticity and credibility
- Completeness of information provided
- Ability to handle difficult questions
- Overall communication effectiveness

PERSONA CONTEXT: ${personaDesc || 'Professional interview setting'}
SKILLS BEING ASSESSED: ${skillsSelected && skillsSelected.length > 0 ? skillsSelected.join(', ') : 'General interview skills'}

ONBOARDING INFO: ${onboarding ? JSON.stringify(onboarding) : 'No additional context provided'}

INSTRUCTIONS:
1. Analyze the interview transcript carefully
2. Provide 3-5 specific strengths demonstrated
3. Provide 3-5 actionable areas for improvement
4. Assign a score from 1-5 (1=needs significant improvement, 5=excellent performance)
5. Be supportive and constructive in your feedback
6. Focus on specific examples from the transcript
7. Provide practical advice for improvement

RESPONSE FORMAT:
You must respond with a valid JSON object containing:
{
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "score": 1-5
}

Do not include any text outside of this JSON structure.`;

    console.log('Generating feedback for user:', user.id);

    // Call OpenAI GPT-4o for feedback analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please analyze this interview transcript and provide feedback:\n\n${transcript}` }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('OpenAI response:', result);

    const feedbackText = result.choices[0]?.message?.content;
    if (!feedbackText) {
      throw new Error('No feedback generated from AI');
    }

    // Parse the JSON feedback
    let feedback;
    try {
      feedback = JSON.parse(feedbackText);
    } catch (parseError) {
      console.error('Failed to parse feedback JSON:', feedbackText);
      throw new Error('Invalid feedback format from AI');
    }

    // Validate feedback structure
    if (!feedback.strengths || !feedback.improvements || !feedback.score) {
      throw new Error('Invalid feedback structure');
    }

    if (!Array.isArray(feedback.strengths) || !Array.isArray(feedback.improvements)) {
      throw new Error('Strengths and improvements must be arrays');
    }

    if (typeof feedback.score !== 'number' || feedback.score < 1 || feedback.score > 5) {
      throw new Error('Score must be a number between 1 and 5');
    }

    // Store feedback in database
    const { data: feedbackData, error: dbError } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        transcript,
        onboarding,
        persona_desc: personaDesc,
        skills_selected: skillsSelected,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        score: feedback.score
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to store feedback: ${dbError.message}`);
    }

    console.log('Feedback stored successfully:', feedbackData.id);

    // Return feedback to client
    return new Response(
      JSON.stringify({
        success: true,
        feedback: {
          id: feedbackData.id,
          strengths: feedback.strengths,
          improvements: feedback.improvements,
          score: feedback.score,
          created_at: feedbackData.created_at
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate_feedback function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});