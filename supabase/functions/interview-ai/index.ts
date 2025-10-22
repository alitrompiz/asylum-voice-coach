import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const parseAllowedOrigins = () => (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const getOrigin = (req: Request) => req.headers.get('Origin') || '';

const buildCors = (req: Request) => {
  const origin = getOrigin(req);
  const list = parseAllowedOrigins();
  const allowed = origin === '' || list.includes(origin);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowed && origin ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  return { headers, allowed };
};

// Template engine for replacing prompt variables
function processPromptTemplate(template: string, variables: Record<string, any>): string {
  let processed = template;
  
  // Replace template variables like {{variable_name}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    processed = processed.replace(regex, String(value || ''));
  });
  
  return processed;
}

serve(async (req) => {
  const { headers: corsHeaders, allowed: originAllowed } = buildCors(req);
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (!originAllowed) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const messages = body?.messages;
    const personaId = body?.personaId;
    const language: string = body?.language ?? 'en';
    const skills: string[] = Array.isArray(body?.skills) ? body.skills : [];
    const sessionId = body?.sessionId;
    const guestStoryData = body?.guestStoryData; // { storyText, firstName, lastName }

    // Input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    if (messages.length > 30) {
      return new Response(JSON.stringify({ error: 'Too many messages (max 30)' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    let totalLen = 0;
    for (const m of messages) {
      if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.text !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid message format' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      if (m.text.length > 2000) {
        return new Response(JSON.stringify({ error: 'Message too long (max 2000 chars)' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      totalLen += m.text.length;
    }
    if (totalLen > 8000) {
      return new Response(JSON.stringify({ error: 'Conversation too long (max 8000 chars)' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user ID from auth header if needed
    let userId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id ?? null;
      } catch (error) {
        console.log('Auth error:', error?.message || 'unknown');
      }
    }

    // Apply rate limiting (20/min)
    const ip = req.headers.get('x-real-ip') ?? (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown');
    const subject = userId ?? ip;
    const { data: allowed, error: rlErr } = await supabase.rpc('check_and_increment_rate_limit', {
      p_route: 'interview-ai',
      p_subject: subject,
      p_limit: 20,
      p_window_seconds: 60,
    });
    if (rlErr) console.error('Rate limit RPC error:', rlErr);
    if (allowed === false) {
      const window = 60; const now = Math.floor(Date.now() / 1000); const retry = window - (now % window);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retry) } });
    }

    // Fetch user context data
    let userContext: any = {};
    if (userId) {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get user's active asylum story
      const { data: stories } = await supabase
        .from('stories')
        .select('story_text, title')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      userContext = {
        profile,
        userStory: stories?.[0]?.story_text || 'No story provided',
        storyTitle: stories?.[0]?.title || 'Untitled',
        firstName: profile?.preferred_name || profile?.legal_name || 'Applicant',
        lastName: profile?.last_name || ''
      };
    } else if (guestStoryData) {
      // Use guest story data for unauthenticated users
      console.log('Using guest story data for interview');
      userContext = {
        profile: null,
        userStory: guestStoryData.storyText || 'No story provided',
        storyTitle: 'Guest Story',
        firstName: guestStoryData.firstName || 'Applicant',
        lastName: guestStoryData.lastName || ''
      };
    }

    // Get persona (officer) data with AI instructions
    let personaData: any = { mood: 'professional', name: 'Officer', ai_instructions: null };
    if (personaId) {
      const { data: persona } = await supabase
        .from('personas')
        .select('mood, name, ai_instructions')
        .eq('id', personaId)
        .single();
      
      if (persona) {
        personaData = persona;
      }
    }

    // Get active base template prompt - REQUIRED
    const { data: promptData, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('prompt_type', 'interview_conduct')
      .eq('is_base_template', true)
      .eq('is_active', true)
      .single();

    if (!promptData) {
      console.error('No active base template prompt found:', promptError);
      throw new Error('No active interview base template configured. Please contact an administrator.');
    }

    // Get focus area AI instructions from skills
    let focusAreasInstructions = 'Conduct a general asylum interview.';
    if (skills.length > 0) {
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select('name, ai_instructions')
        .in('name', skills);

      if (skillsError) {
        console.error('Skills fetch error:', skillsError);
      } else if (skillsData?.length > 0) {
        focusAreasInstructions = skillsData
          .map(skill => skill.ai_instructions || `Ask relevant questions about ${skill.name}`)
          .join('\n\n');
      }
    }

    // Generate officer instructions
    const officerInstructions = personaData.ai_instructions || 
      `You are ${personaData.name}, a professional USCIS asylum officer with a ${personaData.mood} demeanor.`;

    // Use new efficient prompt structure
    const promptVariables = {
      officer_instructions: officerInstructions,
      user_story: userContext.userStory || 'No story provided',
      focus_areas: focusAreasInstructions,
      language: language || 'English',
      first_name: userContext.firstName || 'Applicant',
      last_name: userContext.lastName || '',
      // Backwards compatibility
      country_of_persecution: userContext.profile?.country_of_feared_persecution || 'Not specified',
      skills_selected: skills.length > 0 ? skills.join(', ') : 'General interview skills',
      persona_mood: personaData.mood
    };

    const systemPrompt = processPromptTemplate(promptData.content, promptVariables);
    
    // Log prompt usage
    if (userId) {
      await supabase.rpc('increment_prompt_usage', { prompt_id: promptData.id });
      
      await supabase
        .from('prompt_usage_logs')
        .insert({
          prompt_id: promptData.id,
          interview_session_id: sessionId,
          user_id: userId,
          prompt_type: 'interview_conduct',
          variables_used: promptVariables
        });
    }
      
    // Store session context if sessionId provided
    if (sessionId && userId) {
      await supabase
        .from('interview_sessions')
        .upsert({
          id: sessionId,
          user_id: userId,
          persona_id: personaId,
          skills_selected: skills || [],
          language: language || 'en',
          user_context: {
            profile: userContext.profile,
            story: userContext.userStory,
            prompt_used: promptData.id
          },
          prompt_version_used: promptData.id
        });
    }

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
        presence_penalty: 0.3,
        frequency_penalty: 0.5
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