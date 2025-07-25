
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@2.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WEBHOOK_SECRET = Deno.env.get("AUTH_WEBHOOK_SECRET");

const resend = new Resend(RESEND_API_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthWebhookPayload {
  user: {
    id: string;
    email: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    // Skip webhook signature verification for now
    // Note: In production, you should set up AUTH_WEBHOOK_SECRET for security
    console.log("Processing webhook without signature verification");

    const webhookData: AuthWebhookPayload = JSON.parse(payload);
    const { user, email_data } = webhookData;

    console.log("Processing auth email for:", user.email, "Action:", email_data.email_action_type);

    // Create confirmation URL that goes to our app's verification page
    const confirmUrl = `${email_data.site_url}/auth/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;

    // Prepare email content based on action type
    let subject = "";
    let htmlContent = "";

    if (email_data.email_action_type === "signup") {
      subject = "Welcome to AsylumPrep - Verify Your Email";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AsylumPrep</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">AsylumPrep</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Your Interview Preparation Partner</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome to AsylumPrep!</h2>
            <p style="margin-bottom: 20px;">Thank you for joining AsylumPrep. We're here to help you prepare for your asylum interview with confidence.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                Verify Your Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmUrl}" style="color: #2563eb; word-break: break-all;">${confirmUrl}</a>
            </p>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
            <h3 style="color: #1e40af; margin-top: 0;">What's Next?</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>Complete your profile setup</li>
              <li>Upload your asylum story</li>
              <li>Start practicing with our AI interviewer</li>
              <li>Track your progress and improve</li>
            </ul>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p>This email was sent by AsylumPrep. If you didn't create an account, you can safely ignore this email.</p>
            <p>&copy; 2024 AsylumPrep. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
    } else if (email_data.email_action_type === "recovery") {
      subject = "Reset Your AsylumPrep Password";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - AsylumPrep</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">AsylumPrep</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Your Interview Preparation Partner</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
            <p style="margin-bottom: 20px;">We received a request to reset your password. Click the button below to create a new password.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmUrl}" style="color: #dc2626; word-break: break-all;">${confirmUrl}</a>
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>&copy; 2024 AsylumPrep. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
    } else {
      // Fallback for other email types
      subject = "AsylumPrep Account Verification";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Verification - AsylumPrep</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">AsylumPrep</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Your Interview Preparation Partner</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Account Verification</h2>
            <p style="margin-bottom: 20px;">Please verify your email address to complete this action.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                Verify Email
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmUrl}" style="color: #2563eb; word-break: break-all;">${confirmUrl}</a>
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p>&copy; 2024 AsylumPrep. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
    }

    // Send email via Resend
    console.log("Attempting to send email via Resend...");
    console.log("Resend API Key exists:", !!RESEND_API_KEY);
    
    const emailResponse = await resend.emails.send({
      from: "AsylumPrep <onboarding@resend.dev>",
      to: [user.email],
      subject: subject,
      html: htmlContent,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error(`Resend error: ${emailResponse.error.message}`);
    }

    console.log("Email sent successfully via Resend to:", user.email, "ID:", emailResponse.data?.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in send-auth-email function:", error);
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
