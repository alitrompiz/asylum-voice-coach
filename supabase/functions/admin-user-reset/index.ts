import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user information
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user.email) {
      return new Response(JSON.stringify({ error: "User has no email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has email/password identity
    const { data: identities, error: identitiesError } = await supabase
      .from('auth.identities')
      .select('provider')
      .eq('user_id', userId);

    if (identitiesError) {
      console.error('Error fetching identities:', identitiesError);
    }

    const hasEmailProvider = identities?.some(identity => identity.provider === 'email') || false;
    
    let method: string;
    let emailSent = false;

    try {
      if (hasEmailProvider) {
        // User has email/password - send password reset
        const { error: resetError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: user.email,
          options: {
            redirectTo: `${req.headers.get("origin") || "http://localhost:3000"}/reset-password`
          }
        });

        if (resetError) {
          console.error('Error generating reset link:', resetError);
          method = 'password_reset_failed';
        } else {
          method = 'password_reset';
          emailSent = true;
        }
      } else {
        // User doesn't have email/password - send magic link
        const { error: magicError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: user.email,
          options: {
            redirectTo: `${req.headers.get("origin") || "http://localhost:3000"}/dashboard`
          }
        });

        if (magicError) {
          console.error('Error generating magic link:', magicError);
          method = 'magic_link_failed';
        } else {
          method = 'magic_link';
          emailSent = true;
        }
      }

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_user_id: userData.user.id,
          target_user_id: userId,
          action_type: 'send_auth_reset',
          action_details: { 
            method,
            email_sent: emailSent,
            target_email: user.email
          }
        });

      return new Response(JSON.stringify({
        success: emailSent,
        method,
        message: emailSent 
          ? `${method === 'password_reset' ? 'Password reset' : 'Magic link'} sent to ${user.email}`
          : `Failed to send ${method === 'password_reset' ? 'password reset' : 'magic link'}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (emailError) {
      console.error('Error sending auth email:', emailError);
      
      return new Response(JSON.stringify({
        success: false,
        method: 'email_failed',
        message: 'Failed to send authentication email'
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error('Error in admin-user-reset function:', error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});