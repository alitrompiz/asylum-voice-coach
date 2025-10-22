
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
    const text: string = body?.text;
    const voice: string = body?.voice ?? 'alloy';
    const language: string = body?.language ?? 'en';

    // Input validation
    const allowedVoices = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'verse', 'aria', 'sage', 'amber']);
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) {
      return new Response(JSON.stringify({ error: 'Invalid text. Max length 2000.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!allowedVoices.has(voice)) {
      return new Response(JSON.stringify({ error: 'Invalid voice selection.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rate limiting (30/min per subject)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') || '';
    const sb = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    let userId: string | null = null;
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try { const { data: { user } } = await sb.auth.getUser(token); userId = user?.id ?? null; } catch {}
    }
    const ip = req.headers.get('x-real-ip') ?? (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown');
    const subject = userId ?? ip;
    const { data: allowed, error: rlErr } = await sb.rpc('check_and_increment_rate_limit', {
      p_route: 'text-to-speech',
      p_subject: subject,
      p_limit: 30,
      p_window_seconds: 60,
    });
    if (rlErr) console.error('Rate limit RPC error:', rlErr);
    if (allowed === false) {
      const window = 60; const now = Math.floor(Date.now() / 1000); const retry = window - (now % window);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retry) } });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('TTS Request:', { textLength: text.length, voice, language });

    // Call OpenAI TTS API with language-aware voice selection
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS error:', errorText);
      throw new Error(`OpenAI TTS API error: ${response.status}`);
    }

    // Convert audio to base64 - using a safe approach for binary data
    const audioBuffer = await response.arrayBuffer();
    // Use Deno's built-in encoder for safe binary to base64 conversion
    const base64Audio = btoa(
      Array.from(new Uint8Array(audioBuffer))
        .map(b => String.fromCharCode(b))
        .join('')
    );

    console.log('TTS Success:', { 
      language, 
      voice, 
      audioSize: audioBuffer.byteLength,
      base64Size: base64Audio.length 
    });

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        contentType: 'audio/mpeg',
        language,
        voice
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
