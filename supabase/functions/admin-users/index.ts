import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status_filter?: string;
  attorney_filter?: string;
  auth_filter?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  date_from?: string;
  date_to?: string;
}

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

    const url = new URL(req.url);
    const params: UserQueryParams = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '20'),
      search: url.searchParams.get('search') || undefined,
      status_filter: url.searchParams.get('status_filter') || undefined,
      attorney_filter: url.searchParams.get('attorney_filter') || undefined,
      auth_filter: url.searchParams.get('auth_filter') || undefined,
      sort_by: url.searchParams.get('sort_by') || 'created_at',
      sort_order: (url.searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
      date_from: url.searchParams.get('date_from') || undefined,
      date_to: url.searchParams.get('date_to') || undefined,
    };

    // Build and execute the enriched user query using Supabase client
    let baseQuery = supabase
      .from('profiles')
      .select(`
        user_id,
        display_name,
        legal_name,
        preferred_name,
        is_banned,
        avatar_url,
        created_at,
        subscribers (
          subscribed,
          subscription_tier,
          subscription_end,
          grace_period_end,
          stripe_customer_id,
          attorney_id,
          attorneys (
            display_name,
            firm_name
          )
        ),
        minutes_balance (
          session_seconds_used,
          session_seconds_limit
        ),
        stories (
          created_at
        ),
        interview_sessions (
          session_duration_seconds,
          created_at
        ),
        admin_entitlement_grants (
          end_at_utc,
          created_at
        )
      `);

    // Apply search filter
    if (params.search) {
      baseQuery = baseQuery.or(
        `display_name.ilike.%${params.search}%,` +
        `legal_name.ilike.%${params.search}%,` +
        `preferred_name.ilike.%${params.search}%`
      );
    }

    // Apply status filter
    if (params.status_filter && params.status_filter !== 'all') {
      if (params.status_filter === 'banned') {
        baseQuery = baseQuery.eq('is_banned', true);
      }
      // Other filters will be applied post-query
    }

    // Apply pagination
    const from = ((params.page || 1) - 1) * (params.limit || 20);
    const to = from + (params.limit || 20) - 1;
    
    baseQuery = baseQuery.range(from, to);

    // Apply sorting
    const sortColumn = params.sort_by === 'created_at' ? 'created_at' : 'created_at';
    baseQuery = baseQuery.order(sortColumn, { ascending: params.sort_order === 'asc' });

    const { data: profiles, error: queryError, count } = await baseQuery;

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(JSON.stringify({ error: "Database query failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth users data
    const userIds = profiles?.map(p => p.user_id) || [];
    const authUsers = new Map();
    
    for (const userId of userIds) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        if (authUser) {
          authUsers.set(userId, authUser);
        }
      } catch (error) {
        console.error(`Error fetching auth user ${userId}:`, error);
      }
    }

    // Enrich the data
    const enrichedUsers = profiles?.map(profile => {
      const authUser = authUsers.get(profile.user_id);
      const subscriber = profile.subscribers?.[0];
      const minutesBalance = profile.minutes_balance?.[0];
      const grants = profile.admin_entitlement_grants || [];
      const sessions = profile.interview_sessions || [];
      
      // Calculate entitlement status
      const hasActiveSubscription = subscriber?.subscribed && (
        !subscriber.subscription_end || 
        new Date(subscriber.subscription_end) > new Date() ||
        (subscriber.grace_period_end && new Date(subscriber.grace_period_end) > new Date())
      );
      
      const activeGrant = grants.find(g => new Date(g.end_at_utc) > new Date());
      
      let entitlementStatus = 'free_trial';
      if (hasActiveSubscription) {
        entitlementStatus = 'full_prep_subscription';
      } else if (activeGrant) {
        entitlementStatus = 'full_prep_grant';
      }

      // Calculate usage statistics
      const lifetimeSeconds = sessions.reduce((sum, s) => sum + (s.session_duration_seconds || 0), 0);
      const freeSecondsUsed = minutesBalance?.session_seconds_used || 0;
      const freeSecondsLimit = minutesBalance?.session_seconds_limit || 3600;
      const freeSecondsRemaining = Math.max(0, freeSecondsLimit - freeSecondsUsed);
      
      // Calculate grant remaining time
      const grantRemainingSeconds = activeGrant ? 
        Math.max(0, (new Date(activeGrant.end_at_utc).getTime() - Date.now()) / 1000) : 0;
      
      // Calculate member age
      const createdAt = authUser?.created_at || profile.created_at;
      const memberAgeDays = createdAt ? 
        (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24) : 0;
      
      // Last session
      const lastSession = sessions.length > 0 ? 
        sessions.reduce((latest, session) => 
          new Date(session.created_at) > new Date(latest.created_at) ? session : latest
        ) : null;

      return {
        user_id: profile.user_id,
        email: authUser?.email || '',
        display_name: profile.display_name || profile.legal_name || profile.preferred_name || 'No name',
        is_banned: profile.is_banned || false,
        created_at: createdAt,
        last_sign_in_at: authUser?.last_sign_in_at,
        
        // Entitlement
        entitlement_status: entitlementStatus,
        
        // Subscription
        subscribed: subscriber?.subscribed || false,
        subscription_tier: subscriber?.subscription_tier,
        subscription_end: subscriber?.subscription_end,
        grace_period_end: subscriber?.grace_period_end,
        stripe_customer_id: subscriber?.stripe_customer_id,
        
        // Attorney
        attorney_id: subscriber?.attorney_id,
        attorney_display_name: subscriber?.attorneys?.display_name,
        attorney_firm: subscriber?.attorneys?.firm_name,
        
        // Usage
        lifetime_session_seconds: lifetimeSeconds,
        session_seconds_used: freeSecondsUsed,
        session_seconds_limit: freeSecondsLimit,
        free_seconds_remaining: freeSecondsRemaining,
        last_session_at: lastSession?.created_at,
        
        // Grants
        grant_end_at: activeGrant?.end_at_utc,
        grant_remaining_seconds: grantRemainingSeconds,
        grant_history_count: grants.length,
        
        // Calculated fields
        member_age_days: memberAgeDays,
        
        // Auth methods (simplified)
        auth_methods: ['email'], // Default for now
      };
    }) || [];

    // Apply additional filters that couldn't be done in the query
    let filteredUsers = enrichedUsers;
    
    if (params.status_filter && params.status_filter !== 'all') {
      if (params.status_filter === 'free_trial') {
        filteredUsers = filteredUsers.filter(u => u.entitlement_status === 'free_trial');
      } else if (params.status_filter === 'full_prep') {
        filteredUsers = filteredUsers.filter(u => u.entitlement_status.includes('full_prep'));
      } else if (params.status_filter === 'subscribed') {
        filteredUsers = filteredUsers.filter(u => u.subscribed);
      }
    }

    if (params.attorney_filter && params.attorney_filter !== 'all') {
      filteredUsers = filteredUsers.filter(u => u.attorney_id === params.attorney_filter);
    }

    // Apply sorting on calculated fields
    if (params.sort_by && params.sort_by !== 'created_at') {
      filteredUsers.sort((a, b) => {
        let aVal = 0, bVal = 0;
        
        switch (params.sort_by) {
          case 'lifetime_minutes':
            aVal = a.lifetime_session_seconds / 60;
            bVal = b.lifetime_session_seconds / 60;
            break;
          case 'member_age':
            aVal = a.member_age_days;
            bVal = b.member_age_days;
            break;
          case 'last_active':
            aVal = a.last_session_at ? new Date(a.last_session_at).getTime() : 0;
            bVal = b.last_session_at ? new Date(b.last_session_at).getTime() : 0;
            break;
          default:
            return 0;
        }
        
        return params.sort_order === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return new Response(JSON.stringify({
      users: filteredUsers,
      pagination: {
        page: params.page || 1,
        limit: params.limit || 20,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / (params.limit || 20))
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