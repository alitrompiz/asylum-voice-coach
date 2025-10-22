import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with service role to bypass RLS
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept jobId from body or query params
    let jobId: string;
    
    if (req.method === 'POST') {
      const { jobId: bodyJobId } = await req.json();
      jobId = bodyJobId;
    } else {
      const url = new URL(req.url);
      jobId = url.searchParams.get('jobId') || '';
    }

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'jobId is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Fetching OCR job:', jobId);

    // Fetch job using service role (bypasses RLS)
    const { data: job, error } = await supabase
      .from('ocr_jobs')
      .select('id, status, progress, result, file_name, created_at, completed_at, error_message')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error fetching job:', error);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify(job),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
