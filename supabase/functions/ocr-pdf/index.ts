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
    console.log('=== OCR Function Started ===');
    
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody));
    
    const { filePath, fileName } = requestBody;
    
    if (!filePath || !fileName) {
      throw new Error('Missing filePath or fileName in request');
    }
    
    console.log('Processing file:', fileName, 'at path:', filePath);
    
    // Check AWS credentials
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';
    
    console.log('AWS credentials check:', {
      accessKeyPresent: !!awsAccessKeyId,
      secretKeyPresent: !!awsSecretAccessKey,
      region: awsRegion
    });
    
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error('AWS credentials not configured');
    }
    
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase credentials check:', {
      urlPresent: !!supabaseUrl,
      serviceKeyPresent: !!supabaseServiceKey
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Attempting to download file from storage...');
    
    // Download file from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('story-files')
      .download(filePath);
    
    if (fileError) {
      console.error('Storage download error:', fileError);
      throw new Error(`Failed to download file: ${fileError.message}`);
    }
    
    if (!fileData) {
      throw new Error('No file data received from storage');
    }
    
    console.log('File downloaded successfully:', {
      size: fileData.size,
      type: fileData.type
    });
    
    // For now, return a simple success response with mock OCR data
    // This will help us identify if the issue is with file download or AWS Textract
    const mockOcrResult = {
      text: `Mock OCR result for file: ${fileName}\nThis is a test response to verify the function is working.\nThe file was successfully downloaded from storage with size: ${fileData.size} bytes.`,
      sections: {
        personalInfo: {
          name: "Test Name",
          dateOfBirth: "Test Date"
        },
        asylumClaim: {
          countryOfFear: "Test Country"
        },
        narrative: {}
      }
    };
    
    console.log('Returning mock OCR result');
    
    return new Response(
      JSON.stringify(mockOcrResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Error in OCR function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack
    });
    
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