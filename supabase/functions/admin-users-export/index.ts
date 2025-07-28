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

    // Get filters from request
    const url = new URL(req.url);
    const search = url.searchParams.get('search');
    const statusFilter = url.searchParams.get('status_filter');
    const attorneyFilter = url.searchParams.get('attorney_filter');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');

    // Build comprehensive export query using Supabase client
    let baseQuery = supabase
      .from('profiles')
      .select(`
        user_id,
        display_name,
        legal_name,
        preferred_name,
        is_banned,
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
    if (search) {
      baseQuery = baseQuery.or(
        `display_name.ilike.%${search}%,` +
        `legal_name.ilike.%${search}%,` +
        `preferred_name.ilike.%${search}%`
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'banned') {
        baseQuery = baseQuery.eq('is_banned', true);
      }
    }

    // Apply attorney filter
    if (attorneyFilter && attorneyFilter !== 'all') {
      // This will need to be filtered post-query
    }

    // Apply date filters
    if (dateFrom) {
      baseQuery = baseQuery.gte('created_at', dateFrom);
    }
    if (dateTo) {
      baseQuery = baseQuery.lte('created_at', dateTo);
    }

    // Order by created_at
    baseQuery = baseQuery.order('created_at', { ascending: false });

    // Execute query to get all matching users
    const { data: profiles, error: queryError } = await baseQuery;

    if (queryError) {
      console.error('Export query error:', queryError);
      return new Response(JSON.stringify({ error: "Database query failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ error: "No data to export" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth users data
    const userIds = profiles.map(p => p.user_id);
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

    // Enrich and prepare export data
    let enrichedUsers = profiles.map(profile => {
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
      
      let entitlementStatus = 'Free Trial';
      if (hasActiveSubscription) {
        entitlementStatus = 'Full Prep (Subscription)';
      } else if (activeGrant) {
        entitlementStatus = 'Full Prep (Grant)';
      }

      // Calculate usage statistics
      const lifetimeSeconds = sessions.reduce((sum, s) => sum + (s.session_duration_seconds || 0), 0);
      const lifetimeMinutes = Math.round(lifetimeSeconds / 60 * 100) / 100;
      
      const freeSecondsUsed = minutesBalance?.session_seconds_used || 0;
      const freeSecondsLimit = minutesBalance?.session_seconds_limit || 3600;
      const freeMinutesRemaining = Math.round(Math.max(0, freeSecondsLimit - freeSecondsUsed) / 60 * 100) / 100;
      
      // Calculate grant remaining time
      const grantRemainingSeconds = activeGrant ? 
        Math.max(0, (new Date(activeGrant.end_at_utc).getTime() - Date.now()) / 1000) : 0;
      const grantRemainingDays = Math.round(grantRemainingSeconds / 86400 * 10) / 10;
      
      // Calculate member age
      const createdAt = authUser?.created_at || profile.created_at;
      const memberAgeDays = createdAt ? 
        Math.round((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24) * 10) / 10 : 0;
      
      // Last session
      const lastSession = sessions.length > 0 ? 
        sessions.reduce((latest, session) => 
          new Date(session.created_at) > new Date(latest.created_at) ? session : latest
        ) : null;

      return {
        user_id: profile.user_id,
        email: authUser?.email || '',
        name: profile.display_name || profile.legal_name || profile.preferred_name || 'No name',
        entitlement_status: entitlementStatus,
        subscription_status: subscriber?.subscribed ? 'Active' : 'None',
        subscription_tier: subscriber?.subscription_tier || '',
        subscription_end: subscriber?.subscription_end || '',
        lifetime_minutes: lifetimeMinutes,
        free_minutes_remaining: freeMinutesRemaining,
        attorney_display_name: subscriber?.attorneys?.display_name || '',
        attorney_firm: subscriber?.attorneys?.firm_name || '',
        grant_remaining: activeGrant ? `${grantRemainingDays} days` : 'None',
        grant_history_count: grants.length,
        auth_methods: 'email', // Simplified
        is_banned: profile.is_banned ? 'Yes' : 'No',
        created_at: createdAt,
        last_sign_in_at: authUser?.last_sign_in_at || '',
        last_session_at: lastSession?.created_at || '',
        member_age_days: memberAgeDays,
        attorney_id: subscriber?.attorney_id
      };
    });

    // Apply additional filters
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'free_trial') {
        enrichedUsers = enrichedUsers.filter(u => u.entitlement_status === 'Free Trial');
      } else if (statusFilter === 'full_prep') {
        enrichedUsers = enrichedUsers.filter(u => u.entitlement_status.includes('Full Prep'));
      } else if (statusFilter === 'subscribed') {
        enrichedUsers = enrichedUsers.filter(u => u.subscription_status === 'Active');
      }
    }

    if (attorneyFilter && attorneyFilter !== 'all') {
      enrichedUsers = enrichedUsers.filter(u => u.attorney_id === attorneyFilter);
    }

    // CSV headers
    const headers = [
      'User ID', 'Email', 'Name', 'Entitlement Status', 'Subscription Status',
      'Subscription Tier', 'Subscription End', 'Lifetime Minutes', 'Free Minutes Remaining',
      'Attorney Name', 'Attorney Firm', 'Grant Remaining', 'Grant History Count',
      'Auth Methods', 'Is Banned', 'Created At', 'Last Sign In', 'Last Session',
      'Member Age (Days)'
    ];

    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    for (const user of enrichedUsers) {
      const row = [
        user.user_id,
        user.email,
        user.name,
        user.entitlement_status,
        user.subscription_status,
        user.subscription_tier || '',
        user.subscription_end || '',
        user.lifetime_minutes,
        user.free_minutes_remaining,
        user.attorney_display_name || '',
        user.attorney_firm || '',
        user.grant_remaining,
        user.grant_history_count,
        user.auth_methods || '',
        user.is_banned,
        user.created_at,
        user.last_sign_in_at || '',
        user.last_session_at || '',
        user.member_age_days
      ].map(field => {
        // Escape quotes and wrap in quotes if contains comma
        const str = String(field || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      });
      
      csvContent += row.join(',') + '\n';
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `users-export-${timestamp}.csv`;

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error in admin-users-export function:', error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});