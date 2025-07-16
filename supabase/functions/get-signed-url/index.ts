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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { fileName, contentType } = await req.json();
    
    // Generate unique file path
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const filePath = `stories/${timestamp}-${randomId}-${fileName}`;
    
    // Generate signed URL for upload
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('story-files')
      .createSignedUploadUrl(filePath, {
        upsert: true
      });
    
    if (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError);
      throw signedUrlError;
    }

    return new Response(
      JSON.stringify({
        signedUrl: signedUrlData.signedUrl,
        filePath: filePath,
        token: signedUrlData.token
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-signed-url function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});