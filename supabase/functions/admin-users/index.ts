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

    // Handle both GET and POST requests
    let params: any;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      params = {
        page: parseInt(url.searchParams.get('page') || '1'),
        limit: parseInt(url.searchParams.get('limit') || '20'),
        search: url.searchParams.get('search') || undefined,
        status_filter: url.searchParams.get('status_filter') || 'all',
        attorney_filter: url.searchParams.get('attorney_filter') || undefined,
        sort_by: url.searchParams.get('sort_by') || 'created_at',
        sort_order: url.searchParams.get('sort_order') || 'desc',
      };
    } else if (req.method === 'POST') {
      // Handle POST request with body - safely parse JSON
      let body;
      try {
        const bodyText = await req.text();
        body = bodyText ? JSON.parse(bodyText) : {};
      } catch (error) {
        console.error('Error parsing request body:', error);
        body = {};
      }
      
      params = {
        page: body.page || 1,
        limit: body.limit || 20,
        search: body.search || undefined,
        status_filter: body.status_filter || 'all',
        attorney_filter: body.attorney_filter || undefined,
        sort_by: body.sort_by || 'created_at',
        sort_order: body.sort_order || 'desc',
      };
    } else {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch users from profiles table
    console.log('Fetching users with params:', params);
    
    let query = supabase
      .from('profiles')
      .select(`
        user_id,
        display_name,
        created_at,
        updated_at,
        is_banned
      `, { count: 'exact' });

    if (params.search) {
      query = query.or(`display_name.ilike.%${params.search}%,user_id.eq.${params.search}`);
    }

    const { data: basicUsers, error: usersError, count } = await query
      .order('created_at', { ascending: params.sort_order === 'asc' })
      .range((params.page - 1) * params.limit, params.page * params.limit - 1);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(JSON.stringify({ 
        error: "Database query failed",
        details: usersError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const users = basicUsers || [];
    const totalCount = count || 0;

    // Enrich the data with additional fields
    const enrichedUsers = [];
    
    for (const user of users) {
      try {
        // Get minutes balance
        const { data: minutesData } = await supabase
          .from('minutes_balance')
          .select('session_seconds_used, session_seconds_limit')
          .eq('user_id', user.user_id)
          .maybeSingle();

        // Get lifetime session data
        const { data: sessionData } = await supabase
          .from('interview_sessions')
          .select('session_duration_seconds, created_at')
          .eq('user_id', user.user_id);

        // Get grant data
        const { data: grantData } = await supabase
          .from('admin_entitlement_grants')
          .select('end_at_utc, created_at')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false });

        // Get attorney info if exists
        const { data: subscriberData } = await supabase
          .from('subscribers')
          .select(`
            attorney_id,
            stripe_customer_id,
            subscription_tier,
            subscription_end,
            grace_period_end,
            attorneys (
              display_name,
              firm_name
            )
          `)
          .eq('user_id', user.user_id)
          .single();

        // Calculate enriched data
        const lifetimeSeconds = sessionData?.reduce((sum, s) => sum + (s.session_duration_seconds || 0), 0) || 0;
        const freeSecondsUsed = minutesData?.session_seconds_used || 0;
        const freeSecondsLimit = minutesData?.session_seconds_limit || 3600; // Default 1 hour
        const freeSecondsRemaining = Math.max(0, freeSecondsLimit - freeSecondsUsed);
        
        // Find active grant
        const activeGrant = grantData?.find(g => new Date(g.end_at_utc) > new Date());
        const grantRemainingSeconds = activeGrant ? 
          Math.max(0, (new Date(activeGrant.end_at_utc).getTime() - Date.now()) / 1000) : 0;
        
        // Calculate member age
        const memberAgeDays = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
        
        // Last session
        const lastSession = sessionData && sessionData.length > 0 ? 
          sessionData.reduce((latest, session) => 
            new Date(session.created_at) > new Date(latest.created_at) ? session : latest
          ) : null;

        enrichedUsers.push({
          user_id: user.user_id,
          email: user.email || `user_${user.user_id.slice(0, 8)}@example.com`, // Fallback email
          display_name: user.display_name || 'No name',
          is_banned: user.is_banned || false,
          created_at: user.created_at,
          last_sign_in_at: null, // We'll need to get this from auth if needed
          
          // Entitlement status
          entitlement_status: activeGrant ? 'full_prep_grant' : 'free_trial',
          
          // Subscription
          subscribed: user.has_active_subscription,
          subscription_tier: subscriberData?.subscription_tier,
          subscription_end: subscriberData?.subscription_end,
          grace_period_end: subscriberData?.grace_period_end,
          stripe_customer_id: subscriberData?.stripe_customer_id,
          
          // Attorney
          attorney_id: subscriberData?.attorney_id,
          attorney_display_name: subscriberData?.attorneys?.display_name,
          attorney_firm: subscriberData?.attorneys?.firm_name,
          
          // Usage
          lifetime_session_seconds: lifetimeSeconds,
          session_seconds_used: freeSecondsUsed,
          session_seconds_limit: freeSecondsLimit,
          free_seconds_remaining: freeSecondsRemaining,
          last_session_at: lastSession?.created_at,
          
          // Grants
          grant_end_at: activeGrant?.end_at_utc,
          grant_remaining_seconds: grantRemainingSeconds,
          grant_history_count: grantData?.length || 0,
          
          // Calculated fields
          member_age_days: memberAgeDays,
          
          // Auth methods (simplified)
          auth_methods: ['email'],
        });
      } catch (error) {
        console.error(`Error enriching user ${user.user_id}:`, error);
        // Add basic user data even if enrichment fails
        enrichedUsers.push({
          user_id: user.user_id,
          email: user.email || `user_${user.user_id.slice(0, 8)}@example.com`,
          display_name: user.display_name || 'No name',
          is_banned: user.is_banned || false,
          created_at: user.created_at,
          entitlement_status: 'free_trial',
          subscribed: false,
          lifetime_session_seconds: 0,
          session_seconds_used: 0,
          session_seconds_limit: 3600,
          free_seconds_remaining: 3600,
          grant_remaining_seconds: 0,
          grant_history_count: 0,
          member_age_days: (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24),
          auth_methods: ['email'],
        });
      }
    }

    return new Response(JSON.stringify({
      users: enrichedUsers,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / params.limit)
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Error in admin-users function:', error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});