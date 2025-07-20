// Enhanced OCR function with comprehensive debugging
console.log('=== Enhanced OCR Function Started ===');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
if (Deno.env.get('REQUEST_METHOD') === 'OPTIONS') {
  console.log('Handling CORS preflight request');
  const response = new Response(null, { headers: corsHeaders });
  console.log('CORS response sent');
  EdgeRuntime.waitUntil(Promise.resolve());
  throw response;
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Background processing function
async function processOCRJob(jobId: string, supabase: any): Promise<void> {
  console.log('Starting background processing for job:', jobId);
  
  try {
    // Update job status to processing
    await supabase
      .from('ocr_jobs')
      .update({ status: 'processing', progress: 10 })
      .eq('id', jobId);
    
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('ocr_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      throw new Error('Job not found');
    }
    
    console.log('Processing file:', job.file_path);
    
    // Download file from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('story-files')
      .download(job.file_path);
    
    if (fileError) {
      console.error('Storage download error:', fileError);
      throw new Error(`Failed to download file: ${fileError.message}`);
    }
    
    await supabase
      .from('ocr_jobs')
      .update({ progress: 30 })
      .eq('id', jobId);
    
    console.log('=== FILE VALIDATION ===');
    console.log('File downloaded, size:', fileData.size);
    
    // Validate the PDF file thoroughly
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('Original file size:', fileData.size, 'bytes');
    console.log('ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');
    
    // Check PDF header
    const pdfHeader = String.fromCharCode(...uint8Array.slice(0, 8));
    console.log('PDF header:', pdfHeader);
    
    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error(`Invalid PDF file - header is: ${pdfHeader}`);
    }
    
    // Look for PDF version
    const versionMatch = pdfHeader.match(/%PDF-(\d+\.\d+)/);
    if (versionMatch) {
      console.log('PDF version:', versionMatch[1]);
    }
    
    // Check for common PDF elements to validate integrity
    const pdfContent = String.fromCharCode(...uint8Array);
    const xrefIndex = pdfContent.lastIndexOf('xref');
    const trailerIndex = pdfContent.lastIndexOf('trailer');
    const eofIndex = pdfContent.lastIndexOf('%%EOF');
    
    console.log('PDF structure markers found:');
    console.log('- xref table:', xrefIndex !== -1 ? 'YES' : 'NO');
    console.log('- trailer:', trailerIndex !== -1 ? 'YES' : 'NO');
    console.log('- EOF marker:', eofIndex !== -1 ? 'YES' : 'NO');
    
    // Count potential pages by looking for page objects
    const pageMatches = pdfContent.match(/\/Type\s*\/Page[^s]/g);
    const estimatedPages = pageMatches ? pageMatches.length : 0;
    console.log('Estimated pages from PDF content:', estimatedPages);
    
    // Get Azure credentials
    const azureKey = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY');
    const azureEndpoint = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
    
    if (!azureKey || !azureEndpoint) {
      throw new Error('Azure Document Intelligence credentials not configured');
    }
    
    await supabase
      .from('ocr_jobs')
      .update({ progress: 50 })
      .eq('id', jobId);
    
    console.log('=== AZURE DOCUMENT INTELLIGENCE ===');
    console.log('Azure endpoint:', azureEndpoint);
    console.log('Sending PDF size:', arrayBuffer.byteLength, 'bytes');
    console.log('Estimated pages to process:', estimatedPages);
    
    // Use read model for comprehensive text extraction
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
    
    console.log('Azure submission response:', analyzeResponse.status, analyzeResponse.statusText);
    
    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      console.error('Azure submission failed:', errorText);
      throw new Error(`Azure API error: ${analyzeResponse.status} - ${errorText}`);
    }
    
    // Get operation location
    const operationLocation = analyzeResponse.headers.get('operation-location');
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure');
    }
    
    console.log('Azure operation started:', operationLocation);
    
    await supabase
      .from('ocr_jobs')
      .update({ progress: 60 })
      .eq('id', jobId);
    
    // Poll for results with extended timeout
    let result;
    let attempts = 0;
    const maxAttempts = 240; // 20 minutes for large documents
    const pollInterval = 5000; // 5 seconds
    
    console.log('Starting polling for results...');
    
    while (attempts < maxAttempts) {
      attempts++;
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const pollResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey,
        },
      });
      
      if (!pollResponse.ok) {
        console.error(`Polling failed: ${pollResponse.status}`);
        throw new Error(`Polling failed: ${pollResponse.status}`);
      }
      
      result = await pollResponse.json();
      console.log(`Polling attempt ${attempts}: Status = ${result.status}`);
      
      if (result.status === 'succeeded') {
        console.log('Azure OCR analysis completed successfully!');
        break;
      } else if (result.status === 'failed') {
        console.error('Azure analysis failed:', result);
        throw new Error(`OCR analysis failed: ${result.error?.message || 'Unknown error'}`);
      }
      
      // Update progress
      const progress = Math.min(60 + (attempts * 25) / maxAttempts, 90);
      await supabase
        .from('ocr_jobs')
        .update({ progress: Math.floor(progress) })
        .eq('id', jobId);
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Document analysis timed out after 20 minutes');
    }
    
    console.log('=== AZURE RESULTS ANALYSIS ===');
    console.log('Analysis result keys:', Object.keys(result));
    
    if (!result.analyzeResult) {
      throw new Error('No analyzeResult in response');
    }
    
    const analyzeResult = result.analyzeResult;
    console.log('analyzeResult keys:', Object.keys(analyzeResult));
    console.log('Pages in result:', analyzeResult.pages?.length || 0);
    console.log('Paragraphs in result:', analyzeResult.paragraphs?.length || 0);
    
    // Log detailed page information
    if (analyzeResult.pages) {
      analyzeResult.pages.forEach((page: any, index: number) => {
        console.log(`Page ${index + 1}: ${page.lines?.length || 0} lines, ${page.words?.length || 0} words`);
      });
    }
    
    // Extract text using multiple methods for maximum coverage
    console.log('=== STARTING COMPREHENSIVE TEXT EXTRACTION ===');
    
    let finalText = '';
    let method1Text = '';
    let method2Text = '';
    let method3Text = '';
    
    // Method 1: Direct content
    if (analyzeResult.content) {
      method1Text = analyzeResult.content;
      console.log('Method 1 - Direct content:', method1Text.length, 'characters');
    }
    
    // Method 2: Paragraphs
    if (analyzeResult.paragraphs) {
      console.log('Method 2 - Extracting paragraphs...');
      const paragraphTexts = analyzeResult.paragraphs.map((p: any, index: number) => {
        if (index % 10 === 0) {
          console.log(`  Processed paragraph ${index + 1}/${analyzeResult.paragraphs.length}`);
        }
        return p.content || '';
      });
      method2Text = paragraphTexts.join('\n\n');
      console.log('Method 2 - Paragraphs:', method2Text.length, 'characters');
    }
    
    // Method 3: Page-by-page extraction
    if (analyzeResult.pages) {
      console.log('Method 3 - Page-by-page extraction...');
      const pageTexts = [];
      
      for (let i = 0; i < analyzeResult.pages.length; i++) {
        const page = analyzeResult.pages[i];
        console.log(`\n--- Processing Page ${i + 1} ---`);
        
        let pageText = `\n=== PAGE ${i + 1} OF ${analyzeResult.pages.length} ===\n\n`;
        
        if (page.lines) {
          const lineTexts = page.lines.map((line: any) => line.content || '').filter(Boolean);
          pageText += lineTexts.join('\n');
          console.log(`  Page ${i + 1}: Extracted ${lineTexts.length} lines, ${pageText.length} characters`);
        } else if (page.words) {
          const wordTexts = page.words.map((word: any) => word.content || '').filter(Boolean);
          pageText += wordTexts.join(' ');
          console.log(`  Page ${i + 1}: Extracted ${wordTexts.length} words, ${pageText.length} characters`);
        }
        
        pageTexts.push(pageText);
      }
      
      method3Text = pageTexts.join('\n\n');
      console.log('Method 3 - Page-by-page:', method3Text.length, 'characters');
    }
    
    // Choose the best method (most comprehensive text)
    const methods = [
      { name: 'direct content', text: method1Text },
      { name: 'paragraphs', text: method2Text },
      { name: 'page-by-page', text: method3Text }
    ];
    
    const bestMethod = methods.reduce((best, current) => 
      current.text.length > best.text.length ? current : best
    );
    
    finalText = bestMethod.text;
    
    console.log('\n=== FINAL RESULTS ===');
    console.log('Best method:', bestMethod.name);
    console.log('Total pages:', analyzeResult.pages?.length || 0);
    console.log('Total paragraphs:', analyzeResult.paragraphs?.length || 0);
    console.log('Final text length:', finalText.length, 'characters');
    
    if (finalText.length < 100) {
      console.error('WARNING: Very short text extracted - possible issue!');
    }
    
    if (analyzeResult.pages && analyzeResult.pages.length < estimatedPages * 0.8) {
      console.error(`WARNING: Processed ${analyzeResult.pages.length} pages but estimated ${estimatedPages} pages in PDF`);
    }
    
    console.log('Final extracted text preview:');
    console.log(finalText.substring(0, 500) + '...');
    console.log('Final extracted text ending:');
    console.log('...' + finalText.substring(Math.max(0, finalText.length - 200)));
    
    await supabase
      .from('ocr_jobs')
      .update({ progress: 95 })
      .eq('id', jobId);
    
    // Insert story into database
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert({
        user_id: job.user_id,
        title: `OCR Story - ${job.file_name}`,
        story_text: finalText,
        source_type: 'pdf',
        file_path: job.file_path,
        detected_sections: {
          total_pages: analyzeResult.pages?.length || 0,
          extraction_method: bestMethod.name,
          estimated_pages: estimatedPages,
          azure_model: 'prebuilt-read'
        }
      })
      .select()
      .single();
    
    if (storyError) {
      console.error('Error saving story:', storyError);
      throw new Error('Failed to save extracted story');
    }
    
    console.log('Story saved successfully:', story.id);
    
    // Complete the job
    await supabase
      .from('ocr_jobs')
      .update({ 
        status: 'completed', 
        progress: 100,
        completed_at: new Date().toISOString(),
        result: {
          story_id: story.id,
          text_length: finalText.length,
          pages_processed: analyzeResult.pages?.length || 0,
          extraction_method: bestMethod.name
        }
      })
      .eq('id', jobId);
    
    console.log('OCR job completed successfully:', jobId);
    
  } catch (error) {
    console.error('OCR processing error:', error);
    
    // Update job status to failed
    await supabase
      .from('ocr_jobs')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    throw error;
  }
}

// Main request handler
Deno.serve(async (req) => {
  const requestBody = await req.text();
  console.log('Request body:', requestBody);
  
  try {
    const { filePath, fileName } = JSON.parse(requestBody);
    console.log('Processing file:', fileName, 'at path:', filePath);
    
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Invalid authorization token');
    }
    
    console.log('User authenticated:', user.id);
    
    // Create OCR job entry
    const { data: job, error: jobError } = await supabase
      .from('ocr_jobs')
      .insert({
        user_id: user.id,
        file_path: filePath,
        file_name: fileName,
        status: 'pending'
      })
      .select()
      .single();
    
    if (jobError) {
      console.error('Error creating job:', jobError);
      throw new Error('Failed to create OCR job');
    }
    
    console.log('Created OCR job:', job.id);
    
    // Start background processing
    EdgeRuntime.waitUntil(processOCRJob(job.id, supabase));
    
    // Return immediate response with job ID
    return new Response(
      JSON.stringify({ 
        jobId: job.id,
        status: 'pending',
        message: 'OCR processing started. Check job status for progress.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Error in OCR function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Check function logs for more details',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});