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

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
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
    const audio: string = body?.audio;
    const language: string = body?.language ?? 'en';
    const contentType: string | undefined = body?.contentType || body?.mimeType;

    // Input validation: MIME (if provided), size <= ~12MB
    const allowedTypes = new Set(['audio/mp3','audio/mpeg','audio/mpga','audio/wav','audio/webm','audio/mp4']);
    if (contentType && !allowedTypes.has(contentType)) {
      return new Response(JSON.stringify({ error: 'Unsupported audio MIME type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (typeof audio !== 'string' || audio.length === 0) {
      return new Response(JSON.stringify({ error: 'No audio data provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const approxBytes = Math.floor((audio.length * 3) / 4);
    const maxBytes = 12 * 1024 * 1024; // ~12MB
    if (approxBytes > maxBytes) {
      return new Response(JSON.stringify({ error: 'Audio too large' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      p_route: 'voice-to-text',
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

    console.log('Processing audio data for transcription...', { size: approxBytes, language });

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Try multiple approaches to ensure format compatibility
    let attempts = 0;
    let result;
    let lastError;
    
    // OpenAI supports 'mp3', 'mp4', 'mpeg', 'mpga', 'wav', 'webm'
    // Try different formats in order of likelihood of success
    const formats = [
      { type: 'audio/mp3', ext: 'mp3' },
      { type: 'audio/wav', ext: 'wav' },
      { type: 'audio/webm', ext: 'webm' },
      { type: 'audio/mpeg', ext: 'mpeg' }
    ];
    
    // Try each format until one works
    for (const format of formats) {
      attempts++;
      try {
        console.log(`Transcription attempt ${attempts} with format ${format.ext}...`);
        
        // Prepare form data with the current format
        const formData = new FormData();
        const blob = new Blob([binaryAudio], { type: format.type });
        formData.append('file', blob, `audio.${format.ext}`);
        formData.append('model', 'whisper-1');
        formData.append('language', language);

        // Send to OpenAI Whisper
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Attempt ${attempts} failed: ${errorText}`);
          lastError = `OpenAI API error (${format.ext}): ${response.status} ${errorText}`;
          // Continue to next format
          continue;
        }

        // If we get here, the format worked
        result = await response.json();
        console.log('Whisper transcription result:', result);
        break;
      } catch (error) {
        console.error(`Attempt ${attempts} exception:`, error);
        lastError = error.message;
        // Continue to next format
      }
    }
    
    if (!result) {
      throw new Error(`All transcription attempts failed: ${lastError}`);
    }

    return new Response(
      JSON.stringify({ 
        text: result.text,
        confidence: result.confidence || 1.0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in voice-to-text function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});