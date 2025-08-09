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
    const voice: string = body?.voice ?? '9BWtsMINqrJLrRacOk9x';
    const model: string = body?.model ?? 'eleven_turbo_v2_5';

    // Input validation
    const allowedVoices = new Set([
      '9BWtsMINqrJLrRacOk9x','CwhRBWXzGAHq8TQ4Fs17','EXAVITQu4vr4xnSDxMaL','FGY2WhTYpPnrIDTdsKH5','IKne3meq5aSn9XLyUdCD',
      'JBFqnCBsd6RMkjVDRZzb','N2lVS1w4EtoT3dr4eOWO','SAz9YHcvj6GT2YYXdXww','TX3LPaxmHKxFdv7VOQHJ','XB0fDUnXU5powFXDhCwa',
      'Xb7hH8MSUJpSbSDYk0k2','XrExE9yKIg1WjnnlVkGX','bIHbv24MWmeRgasZH58o','cgSgspJ2msm6clMCkdW9','cjVigY5qzO86Huf0OWal',
      'iP95p4xoKVk53GoZ742B','nPczCjzI2devNBz1zQrb','onwK4e9ZLuTAKqWW03F9','pFZP5JQG7iQjIQuC4Bku','pqHfZKP75CvOlQylNhV4'
    ]);
    const allowedModels = new Set(['eleven_turbo_v2_5','eleven_turbo_v2','eleven_multilingual_v2']);
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) {
      return new Response(JSON.stringify({ error: 'Invalid text. Max length 2000.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!allowedVoices.has(voice) || !allowedModels.has(model)) {
      return new Response(JSON.stringify({ error: 'Invalid voice or model.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      p_route: 'eleven-labs-tts',
      p_subject: subject,
      p_limit: 30,
      p_window_seconds: 60,
    });
    if (rlErr) console.error('Rate limit RPC error:', rlErr);
    if (allowed === false) {
      const window = 60; const now = Math.floor(Date.now() / 1000); const retry = window - (now % window);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retry) } });
    }

    const elevenLabsApiKey = Deno.env.get('ELEVEN_LABS_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    console.log('ElevenLabs TTS Request:', { textLength: text.length, voice, model });

    // Call ElevenLabs TTS API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs TTS error:', errorText);
      throw new Error(`ElevenLabs TTS API error: ${response.status}`);
    }

    // Convert audio to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      Array.from(new Uint8Array(audioBuffer))
        .map(b => String.fromCharCode(b))
        .join('')
    );

    console.log('ElevenLabs TTS Success:', { 
      voice, 
      model,
      audioSize: audioBuffer.byteLength,
      base64Size: base64Audio.length 
    });

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        contentType: 'audio/mpeg',
        voice,
        model
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in eleven-labs-tts function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});