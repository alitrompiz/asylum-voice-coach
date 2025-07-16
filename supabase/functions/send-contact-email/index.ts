import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  email: string;
  subject: string;
  message: string;
  userEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, subject, message, userEmail }: ContactEmailRequest = await req.json();

    console.log("Sending contact email:", { email, subject, userEmail });

    const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SENDGRID_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: "atrompiz1@gmail.com" }],
            subject: `Contact Form: ${subject}`,
          },
        ],
        from: {
          email: "noreply@yourdomain.com", // Replace with your verified sender
          name: "Interview App Contact Form",
        },
        reply_to: {
          email: userEmail || email,
        },
        content: [
          {
            type: "text/html",
            value: `
              <h2>New Contact Form Submission</h2>
              <p><strong>From:</strong> ${userEmail || email}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Message:</strong></p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <hr>
              <p><small>Sent via Interview App Contact Form</small></p>
            `,
          },
        ],
      }),
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error("SendGrid API error:", errorText);
      throw new Error(`SendGrid API error: ${sendGridResponse.status} ${errorText}`);
    }

    console.log("Email sent successfully via SendGrid");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);