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
    const { text, voice = 'Joanna', language = 'en-US' } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    // Get AWS credentials
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';
    
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    // Create AWS signature v4 for Polly
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const date = timestamp.substring(0, 8);
    const service = 'polly';
    const method = 'POST';
    const canonicalUri = '/v1/speech';
    const canonicalQueryString = '';
    
    const requestBody = JSON.stringify({
      Text: text,
      VoiceId: voice,
      OutputFormat: 'mp3',
      TextType: 'text',
      LanguageCode: language
    });

    const payloadHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(requestBody))
      .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    const canonicalHeaders = [
      `host:polly.${awsRegion}.amazonaws.com`,
      `x-amz-date:${timestamp}`,
      `x-amz-target:Polly.SynthesizeSpeech`
    ].join('\n') + '\n';
    
    const signedHeaders = 'host;x-amz-date;x-amz-target';
    const canonicalRequest = [method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${date}/${awsRegion}/${service}/aws4_request`;
    const stringToSign = [
      algorithm, 
      timestamp, 
      credentialScope, 
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''))
    ].join('\n');
    
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
    
    // Call AWS Polly
    const pollyResponse = await fetch(`https://polly.${awsRegion}.amazonaws.com/v1/speech`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationHeader,
        'Content-Type': 'application/x-amz-json-1.0',
        'X-Amz-Date': timestamp,
        'X-Amz-Target': 'Polly.SynthesizeSpeech'
      },
      body: requestBody
    });
    
    if (!pollyResponse.ok) {
      const errorText = await pollyResponse.text();
      console.error('Polly error:', errorText);
      throw new Error(`Polly API error: ${pollyResponse.status} ${errorText}`);
    }
    
    // Convert audio to base64
    const audioBuffer = await pollyResponse.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        contentType: 'audio/mpeg'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});