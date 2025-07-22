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
    const { text, voice = '9BWtsMINqrJLrRacOk9x', model = 'eleven_turbo_v2_5' } = await req.json();
    
    // Add a unique request ID for tracking
    const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    if (!text) {
      throw new Error('Text is required');
    }

    const elevenLabsApiKey = Deno.env.get('ELEVEN_LABS_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    console.log(`[${requestId}] ElevenLabs TTS Request:`, { 
      textLength: text.length, 
      voice, 
      model,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });

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
      console.error(`[${requestId}] ElevenLabs TTS error:`, errorText);
      throw new Error(`ElevenLabs TTS API error: ${response.status} - ${errorText}`);
    }

    // Convert audio to base64
    const audioBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    
    // Verify audio content is not empty
    if (uint8Array.length === 0) {
      throw new Error('Received empty audio from ElevenLabs');
    }
    
    // Ensure we have valid audio data by checking first bytes (MP3 header starts with 0xFF)
    if (uint8Array[0] !== 0xFF && uint8Array[1] !== 0xFB) {
      console.warn(`[${requestId}] Warning: Audio data may not be valid MP3. First bytes:`, uint8Array.slice(0, 10));
    }
    
    // Convert to base64
    const base64Audio = btoa(
      Array.from(uint8Array)
        .map(b => String.fromCharCode(b))
        .join('')
    );

    console.log(`[${requestId}] ElevenLabs TTS Success:`, { 
      voice, 
      model,
      audioSize: audioBuffer.byteLength,
      base64Size: base64Audio.length,
      firstBytes: Array.from(uint8Array.slice(0, 5)).map(b => b.toString(16)).join(' ')
    });

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        contentType: 'audio/mpeg',
        voice,
        model,
        requestId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in eleven-labs-tts-v2 function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});