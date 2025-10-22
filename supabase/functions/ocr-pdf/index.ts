import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

console.log('=== OCR Function Started ===');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with service role
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simplified background processing function
async function processOCRJob(jobId: string): Promise<void> {
  console.log('Starting OCR processing for job:', jobId);
  
  try {
    // Get job details using service role (bypass RLS)
    const { data: job, error: jobError } = await supabase
      .from('ocr_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return;
    }
    
    console.log('Processing file:', job.file_path);
    
    // Download file
    const { data: fileData, error: fileError } = await supabase.storage
      .from('story-files')
      .download(job.file_path);
    
    if (fileError) {
      console.error('Storage error:', fileError);
      throw new Error(`Failed to download file: ${fileError.message}`);
    }
    
    console.log('File downloaded, size:', fileData.size);
    
    // Get Azure credentials
    const azureKey = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY');
    const azureEndpoint = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
    
    if (!azureKey || !azureEndpoint) {
      throw new Error('Azure credentials not configured');
    }
    
    // Process with Azure
    const arrayBuffer = await fileData.arrayBuffer();
    const analyzeUrl = `${azureEndpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;
    
    console.log('Submitting to Azure...');
    const analyzeResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/pdf',
        'Accept': 'application/json'
      },
      body: arrayBuffer
    });
    
    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      console.error('Azure error:', errorText);
      throw new Error(`Azure API error: ${analyzeResponse.status} - ${errorText}`);
    }
    
    const operationLocation = analyzeResponse.headers.get('operation-location');
    if (!operationLocation) {
      throw new Error('No operation location returned');
    }
    
    console.log('Polling for results...');
    
    // Poll for results
    let result;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes
    
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const pollResponse = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': azureKey }
      });
      
      if (!pollResponse.ok) {
        throw new Error(`Polling failed: ${pollResponse.status}`);
      }
      
      result = await pollResponse.json();
      console.log(`Attempt ${attempts}: ${result.status}`);
      
      if (result.status === 'succeeded') break;
      if (result.status === 'failed') {
        throw new Error(`Analysis failed: ${result.error?.message || 'Unknown error'}`);
      }
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Analysis timed out');
    }
    
    // Extract text
    let finalText = '';
    const analyzeResult = result.analyzeResult;
    
    if (analyzeResult?.content) {
      finalText = analyzeResult.content;
    } else if (analyzeResult?.paragraphs) {
      finalText = analyzeResult.paragraphs.map((p: any) => p.content || '').join('\n\n');
    } else if (analyzeResult?.pages) {
      const pageTexts = analyzeResult.pages.map((page: any, index: number) => {
        let pageText = `\n=== PAGE ${index + 1} OF ${analyzeResult.pages.length} ===\n\n`;
        if (page.lines) {
          pageText += page.lines.map((line: any) => line.content || '').join('\n');
        }
        return pageText;
      });
      finalText = pageTexts.join('\n\n');
    }
    
    console.log('Extracted text length:', finalText.length);
    console.log('Pages processed:', analyzeResult?.pages?.length || 0);
    
    // Create story directly using service role (bypass RLS)
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert({
        user_id: job.user_id,
        title: `OCR Story - ${job.file_name}`,
        story_text: finalText,
        source_type: 'pdf',
        file_path: job.file_path,
        detected_sections: {
          total_pages: analyzeResult?.pages?.length || 0,
          azure_model: 'prebuilt-read'
        }
      })
      .select()
      .single();
    
    if (storyError) {
      console.error('Story creation error:', storyError);
      throw new Error('Failed to save story');
    }
    
    console.log('Story created:', story.id);
    
    // Update job status to completed using service role
    await supabase
      .from('ocr_jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        result: {
          story_id: story.id,
          text_length: finalText.length,
          pages_processed: analyzeResult?.pages?.length || 0
        }
      })
      .eq('id', jobId);
    
    console.log('OCR job completed successfully');
    
  } catch (error) {
    console.error('OCR processing error:', error);
    
    // Update job to failed using service role
    await supabase
      .from('ocr_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

// Main request handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, fileName } = await req.json();
    console.log('Processing:', fileName, 'at:', filePath);
    
    // Get user from auth header (if provided)
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (user && !authError) {
        userId = user.id;
      }
    }
    
    console.log('User ID:', userId || 'GUEST');
    
    // Create OCR job using service role
    const { data: job, error: jobError } = await supabase
      .from('ocr_jobs')
      .insert({
        user_id: userId,
        file_path: filePath,
        file_name: fileName,
        status: 'pending'
      })
      .select()
      .single();
    
    if (jobError) {
      console.error('Job creation error:', jobError);
      throw new Error('Failed to create OCR job');
    }
    
    console.log('Created job:', job.id);
    
    // Start background processing
    EdgeRuntime.waitUntil(processOCRJob(job.id));
    
    return new Response(
      JSON.stringify({
        jobId: job.id,
        status: 'pending',
        message: 'OCR processing started'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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