import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { messages, personaId, language = 'en', skills = [] } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create system prompt based on persona and skills
    const systemPrompt = `You are an experienced asylum interview officer conducting a practice interview session. 

PERSONA: ${personaId || 'professional'}
LANGUAGE: ${language}
SKILLS TO ASSESS: ${skills.length > 0 ? skills.join(', ') : 'general communication, storytelling, legal knowledge'}

INSTRUCTIONS:
- Ask relevant questions about the asylum seeker's story and background
- Be professional but empathetic
- Focus on helping them practice articulating their experiences clearly
- Ask follow-up questions to help them provide more detail
- Provide gentle guidance if they seem unclear or need encouragement
- Keep responses concise but thorough
- Respond in ${language === 'en' ? 'English' : language}
- This is a practice session to help them prepare for their real interview

Current conversation context: You are in an ongoing practice interview session.`;

    // Format messages for OpenAI
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))
    ];

    console.log('Sending to OpenAI:', { messages: formattedMessages });

    // Call OpenAI GPT-4o
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: formattedMessages,
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('OpenAI response:', result);

    const aiResponse = result.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    return new Response(
      JSON.stringify({ 
        text: aiResponse,
        usage: result.usage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in interview-ai function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});