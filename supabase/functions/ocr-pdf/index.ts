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
    const { filePath, fileName } = await req.json();
    
    // Get AWS credentials from environment
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';
    
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error('AWS credentials not configured');
    }
    
    // Get file from Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: fileData, error: fileError } = await supabase.storage
      .from('story-files')
      .download(filePath);
    
    if (fileError) {
      console.error('Error downloading file:', fileError);
      throw fileError;
    }
    
    // Convert file to base64 for Textract
    const fileBuffer = await fileData.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    // Create AWS signature v4 for Textract
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const date = timestamp.substring(0, 8);
    const service = 'textract';
    const method = 'POST';
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const payloadHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({
      Document: { Bytes: base64Data },
      FeatureTypes: ["FORMS", "TABLES"]
    }))).then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    const canonicalHeaders = [
      `host:textract.${awsRegion}.amazonaws.com`,
      `x-amz-date:${timestamp}`,
      `x-amz-target:Textract.AnalyzeDocument`
    ].join('\n') + '\n';
    
    const signedHeaders = 'host;x-amz-date;x-amz-target';
    const canonicalRequest = [method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${date}/${awsRegion}/${service}/aws4_request`;
    const stringToSign = [algorithm, timestamp, credentialScope, await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest)).then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''))].join('\n');
    
    // Create signature
    const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
      const kDate = await crypto.subtle.importKey('raw', new TextEncoder().encode('AWS4' + key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const kRegion = await crypto.subtle.importKey('raw', new Uint8Array(await crypto.subtle.sign('HMAC', kDate, new TextEncoder().encode(dateStamp))), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const kService = await crypto.subtle.importKey('raw', new Uint8Array(await crypto.subtle.sign('HMAC', kRegion, new TextEncoder().encode(regionName))), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const kSigning = await crypto.subtle.importKey('raw', new Uint8Array(await crypto.subtle.sign('HMAC', kService, new TextEncoder().encode(serviceName))), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      return await crypto.subtle.importKey('raw', new Uint8Array(await crypto.subtle.sign('HMAC', kSigning, new TextEncoder().encode('aws4_request'))), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    };
    
    const signingKey = await getSignatureKey(awsSecretAccessKey, date, awsRegion, service);
    const signature = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(stringToSign)))).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const authorizationHeader = `${algorithm} Credential=${awsAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    // Call AWS Textract
    const textractResponse = await fetch(`https://textract.${awsRegion}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationHeader,
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Date': timestamp,
        'X-Amz-Target': 'Textract.AnalyzeDocument'
      },
      body: JSON.stringify({
        Document: { Bytes: base64Data },
        FeatureTypes: ["FORMS", "TABLES"]
      })
    });
    
    if (!textractResponse.ok) {
      const errorText = await textractResponse.text();
      console.error('Textract error:', errorText);
      throw new Error(`Textract API error: ${textractResponse.status} ${errorText}`);
    }
    
    const textractData = await textractResponse.json();
    
    // Parse Textract response to extract text and form data
    let extractedText = '';
    const sections: any = {
      personalInfo: {},
      asylumClaim: {},
      narrative: {}
    };
    
    if (textractData.Blocks) {
      // Extract LINE blocks for text
      const lineBlocks = textractData.Blocks.filter((block: any) => block.BlockType === 'LINE');
      extractedText = lineBlocks.map((block: any) => block.Text).join('\n');
      
      // Extract form data from KEY_VALUE_SET blocks
      const keyValueSets = textractData.Blocks.filter((block: any) => block.BlockType === 'KEY_VALUE_SET');
      const keyBlocks = keyValueSets.filter((block: any) => block.EntityTypes?.includes('KEY'));
      const valueBlocks = keyValueSets.filter((block: any) => block.EntityTypes?.includes('VALUE'));
      
      // Map keys to values based on relationships
      keyBlocks.forEach((keyBlock: any) => {
        const keyText = keyBlock.Text || '';
        const relationships = keyBlock.Relationships || [];
        const valueRelationship = relationships.find((rel: any) => rel.Type === 'VALUE');
        
        if (valueRelationship) {
          const valueBlock = valueBlocks.find((vb: any) => vb.Id === valueRelationship.Ids[0]);
          if (valueBlock) {
            const valueText = valueBlock.Text || '';
            
            // Categorize form fields based on common I-589 patterns
            if (keyText.toLowerCase().includes('name') || keyText.toLowerCase().includes('apellido')) {
              sections.personalInfo.name = valueText;
            } else if (keyText.toLowerCase().includes('birth') || keyText.toLowerCase().includes('nacimiento')) {
              sections.personalInfo.dateOfBirth = valueText;
            } else if (keyText.toLowerCase().includes('country') && keyText.toLowerCase().includes('birth')) {
              sections.personalInfo.countryOfBirth = valueText;
            } else if (keyText.toLowerCase().includes('fear') || keyText.toLowerCase().includes('persecution')) {
              sections.asylumClaim.countryOfFear = valueText;
            }
          }
        }
      });
    }
    
    const ocrResult = {
      text: extractedText,
      sections: sections
    };
    
    return new Response(
      JSON.stringify(ocrResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ocr-pdf function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});