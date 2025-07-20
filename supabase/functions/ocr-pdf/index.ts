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
    console.log('=== Enhanced OCR Function Started ===');
    
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody));
    
    const { filePath, fileName } = requestBody;
    
    if (!filePath || !fileName) {
      throw new Error('Missing filePath or fileName in request');
    }
    
    console.log('Processing file:', fileName, 'at path:', filePath);
    
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
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

async function processOCRJob(jobId: string, supabase: any) {
  try {
    console.log('Starting background processing for job:', jobId);
    
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
    
    console.log('File downloaded, size:', fileData.size);
    
    // Get Azure Document Intelligence credentials
    const azureKey = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY');
    const azureEndpoint = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
    
    if (!azureKey || !azureEndpoint) {
      throw new Error('Azure Document Intelligence credentials not configured');
    }
    
    // Convert file to base64 using chunks to avoid stack overflow
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid maximum call stack size exceeded
    let base64Data = '';
    const chunkSize = 8192; // 8KB chunks
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64Data += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
    }
    
    await supabase
      .from('ocr_jobs')
      .update({ progress: 50 })
      .eq('id', jobId);
    
    console.log('Sending to Azure Document Intelligence...');
    
    // Submit document to Azure Document Intelligence using the read model for better multi-page handling
    const analyzeUrl = `${azureEndpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;
    
    console.log('Using prebuilt-read model for better multi-page text extraction');
    
    const analyzeResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/pdf'
      },
      body: arrayBuffer
    });
    
    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      throw new Error(`Azure API error: ${analyzeResponse.status} - ${errorText}`);
    }
    
    // Get operation location from response headers
    const operationLocation = analyzeResponse.headers.get('operation-location');
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure');
    }
    
    await supabase
      .from('ocr_jobs')
      .update({ progress: 60 })
      .eq('id', jobId);
    
    console.log('Document submitted, polling for results...');
    
    // Poll for results with longer timeout for large documents
    let result;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes maximum for large multi-page documents
    
    console.log('Starting polling for OCR results...');
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const resultResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey
        }
      });
      
      if (!resultResponse.ok) {
        throw new Error(`Failed to get results: ${resultResponse.status}`);
      }
      
      result = await resultResponse.json();
      
      console.log(`Polling attempt ${attempts + 1}: Status = ${result.status}`);
      
      if (result.status === 'succeeded') {
        console.log('Azure OCR analysis completed successfully!');
        break;
      } else if (result.status === 'failed') {
        console.error('Azure analysis failed:', result);
        throw new Error(`Document analysis failed: ${JSON.stringify(result)}`);
      } else if (result.status === 'running') {
        console.log(`Analysis still running... (attempt ${attempts + 1}/${maxAttempts})`);
      }
      
      attempts++;
      
      // Update progress more frequently for large documents
      const progress = Math.min(60 + (attempts * 0.25), 90);
      await supabase
        .from('ocr_jobs')
        .update({ progress: Math.floor(progress) })
        .eq('id', jobId);
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Document analysis timed out');
    }
    
    console.log('OCR analysis completed successfully');
    
    // Log the full result structure for debugging
    console.log('Full Azure result structure:', JSON.stringify(result, null, 2).substring(0, 1000) + '...');
    console.log('analyzeResult keys:', Object.keys(result.analyzeResult || {}));
    console.log('Pages in result:', result.analyzeResult?.pages?.length || 0);
    console.log('Paragraphs in result:', result.analyzeResult?.paragraphs?.length || 0);
    
    // Extract and structure the data
    const extractedData = extractI589Data(result.analyzeResult);
    
    console.log('Final extracted text length:', extractedData.text.length);
    console.log('Final extracted text preview:', extractedData.text.substring(0, 500) + '...');
    console.log('Final extracted text ending:', extractedData.text.substring(extractedData.text.length - 500));
    
    // Update job with results
    await supabase
      .from('ocr_jobs')
      .update({ 
        status: 'completed',
        progress: 100,
        result: extractedData,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    console.log('OCR job completed successfully:', jobId);
    
  } catch (error) {
    console.error('Error processing OCR job:', error);
    
    // Update job with error
    await supabase
      .from('ocr_jobs')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', jobId);
  }
}

function extractI589Data(analyzeResult: any) {
  console.log('Extracting I-589 form data...');
  
  const pages = analyzeResult.pages || [];
  const tables = analyzeResult.tables || [];
  const paragraphs = analyzeResult.paragraphs || [];
  
  console.log(`Total pages found: ${pages.length}`);
  console.log(`Total paragraphs found: ${paragraphs.length}`);
  console.log(`Total tables found: ${tables.length}`);
  
  // Extract text content from multiple sources for completeness
  let fullText = '';
  
  // Method 1: Extract from paragraphs (structured text)
  console.log('Method 1: Extracting from paragraphs...');
  for (const paragraph of paragraphs) {
    fullText += paragraph.content + '\n';
  }
  console.log(`Paragraph extraction length: ${fullText.length}`);
  
  // Method 2: Extract from individual pages and lines
  let pageByPageText = '';
  console.log('Method 2: Extracting page by page...');
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    pageByPageText += `\n=== PAGE ${i + 1} ===\n`;
    console.log(`Processing page ${i + 1}`);
    
    let pageText = '';
    
    // Extract from lines if available
    if (page.lines && page.lines.length > 0) {
      console.log(`  Found ${page.lines.length} lines on page ${i + 1}`);
      for (const line of page.lines) {
        pageText += line.content + '\n';
      }
    }
    
    // If no lines, extract from words
    if (!pageText && page.words && page.words.length > 0) {
      console.log(`  No lines found, extracting from ${page.words.length} words on page ${i + 1}`);
      let currentLine = '';
      let lastTop = -1;
      
      for (const word of page.words) {
        const wordTop = word.boundingBox ? word.boundingBox[1] : 0;
        
        // Start new line if word is significantly below the last one
        if (lastTop >= 0 && Math.abs(wordTop - lastTop) > 10) {
          pageText += currentLine.trim() + '\n';
          currentLine = '';
        }
        
        currentLine += word.content + ' ';
        lastTop = wordTop;
      }
      
      if (currentLine.trim()) {
        pageText += currentLine.trim() + '\n';
      }
    }
    
    console.log(`  Page ${i + 1} text length: ${pageText.length}`);
    pageByPageText += pageText;
  }
  
  console.log(`Page-by-page extraction total length: ${pageByPageText.length}`);
  
  // Method 3: Extract all content from the entire document
  let allContentText = '';
  console.log('Method 3: Extracting all document content...');
  
  // Extract from document-level content if available
  if (analyzeResult.content) {
    allContentText = analyzeResult.content;
    console.log(`Document content length: ${allContentText.length}`);
  }
  
  // Use the most complete text source
  let bestText = fullText;
  let method = 'paragraphs';
  
  if (pageByPageText.length > bestText.length) {
    bestText = pageByPageText;
    method = 'page-by-page';
  }
  
  if (allContentText.length > bestText.length) {
    bestText = allContentText;
    method = 'document content';
  }
  
  console.log(`Best extraction method: ${method} with ${bestText.length} characters`);
  
  // Extract structured data for I-589 form
  const extractedSections = {
    personalInfo: extractPersonalInfo(bestText, tables),
    asylumClaim: extractAsylumClaim(bestText),
    narrative: extractNarrative(bestText),
    tables: extractTables(tables),
    checkboxes: extractCheckboxes(pages),
    extractionMetadata: {
      totalPages: pages.length,
      extractionMethod: method,
      textLengths: {
        paragraphs: fullText.length,
        pageByPage: pageByPageText.length,
        documentContent: allContentText.length
      }
    }
  };
  
  return {
    text: bestText,
    sections: extractedSections,
    confidence: calculateConfidence(analyzeResult),
    pageCount: pages.length,
    processedAt: new Date().toISOString()
  };
}

function extractPersonalInfo(text: string, tables: any[]) {
  const info: any = {};
  
  // Extract name patterns
  const namePatterns = [
    /Family Name[:\s]*([A-Za-z\s]+)/i,
    /Given Name[:\s]*([A-Za-z\s]+)/i,
    /Middle Name[:\s]*([A-Za-z\s]+)/i
  ];
  
  namePatterns.forEach((pattern, index) => {
    const match = text.match(pattern);
    if (match) {
      const fields = ['familyName', 'givenName', 'middleName'];
      info[fields[index]] = match[1].trim();
    }
  });
  
  // Extract date of birth
  const dobPattern = /Date of Birth[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
  const dobMatch = text.match(dobPattern);
  if (dobMatch) {
    info.dateOfBirth = dobMatch[1];
  }
  
  // Extract country of birth
  const countryPattern = /Country of Birth[:\s]*([A-Za-z\s]+)/i;
  const countryMatch = text.match(countryPattern);
  if (countryMatch) {
    info.countryOfBirth = countryMatch[1].trim();
  }
  
  return info;
}

function extractAsylumClaim(text: string) {
  const claim: any = {};
  
  // Extract country of feared persecution
  const countryPattern = /country.*fear.*persecution[:\s]*([A-Za-z\s]+)/i;
  const countryMatch = text.match(countryPattern);
  if (countryMatch) {
    claim.countryOfFear = countryMatch[1].trim();
  }
  
  return claim;
}

function extractNarrative(text: string) {
  // Look for narrative sections in the text
  const narrativePattern = /why.*you.*leaving.*country[:\s]*([^.]+)/i;
  const match = text.match(narrativePattern);
  
  return {
    reason: match ? match[1].trim() : '',
    fullNarrative: text
  };
}

function extractTables(tables: any[]) {
  return tables.map(table => ({
    rowCount: table.rowCount,
    columnCount: table.columnCount,
    cells: table.cells?.map((cell: any) => ({
      content: cell.content,
      rowIndex: cell.rowIndex,
      columnIndex: cell.columnIndex
    })) || []
  }));
}

function extractCheckboxes(pages: any[]) {
  const checkboxes: any[] = [];
  
  for (const page of pages) {
    // Look for selection marks (checkboxes)
    if (page.selectionMarks) {
      for (const mark of page.selectionMarks) {
        checkboxes.push({
          state: mark.state, // 'selected' or 'unselected'
          confidence: mark.confidence,
          boundingBox: mark.boundingRegions?.[0]?.polygon
        });
      }
    }
  }
  
  return checkboxes;
}

function calculateConfidence(analyzeResult: any) {
  const paragraphs = analyzeResult.paragraphs || [];
  if (paragraphs.length === 0) return 0;
  
  const totalConfidence = paragraphs.reduce((sum: number, p: any) => sum + (p.confidence || 0), 0);
  return totalConfidence / paragraphs.length;
}