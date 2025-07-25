import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  type: 'session' | 'general';
  thumbValue?: 'up' | 'down';
  feedbackText: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { type, thumbValue, feedbackText }: FeedbackRequest = await req.json();

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, legal_name, preferred_name')
      .eq('user_id', user.id)
      .single();

    const userName = profile?.display_name || profile?.preferred_name || profile?.legal_name || user.email || 'Unknown User';

    // Prepare email content based on feedback type
    let subject: string;
    let htmlContent: string;

    if (type === 'session') {
      subject = `Session Feedback: ${thumbValue === 'up' ? '👍' : '👎'} from ${userName}`;
      htmlContent = `
        <h2>Session Feedback Received</h2>
        <p><strong>User:</strong> ${userName} (${user.email})</p>
        <p><strong>Rating:</strong> ${thumbValue === 'up' ? '👍 Positive' : '👎 Negative'}</p>
        <p><strong>Feedback:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${feedbackText.replace(/\n/g, '<br>')}
        </div>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      `;
    } else {
      subject = `General Feedback from ${userName}`;
      htmlContent = `
        <h2>General Feedback Received</h2>
        <p><strong>User:</strong> ${userName} (${user.email})</p>
        <p><strong>Feedback:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${feedbackText.replace(/\n/g, '<br>')}
        </div>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      `;
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "AsylumPrep Feedback <onboarding@resend.dev>",
      to: ["atrompiz1@gmail.com"],
      subject: subject,
      html: htmlContent,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error(`Failed to send feedback email: ${emailResponse.error.message}`);
    }

    console.log("Feedback email sent successfully:", emailResponse.data?.id);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-feedback-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);