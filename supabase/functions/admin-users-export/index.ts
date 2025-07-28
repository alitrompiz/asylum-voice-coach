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

    // Build comprehensive export query
    let query = `
      WITH user_enriched AS (
        SELECT 
          au.id as user_id,
          au.email,
          au.created_at,
          au.last_sign_in_at,
          p.display_name,
          p.legal_name,
          p.preferred_name,
          p.is_banned,
          
          -- Entitlement status
          CASE 
            WHEN s.subscribed = true AND (
              s.subscription_end IS NULL OR 
              s.subscription_end > now() OR
              (s.grace_period_end IS NOT NULL AND s.grace_period_end > now())
            ) THEN 'Full Prep (Subscription)'
            WHEN EXISTS (
              SELECT 1 FROM admin_entitlement_grants aeg
              WHERE aeg.user_id = au.id AND aeg.end_at_utc > now()
            ) THEN 'Full Prep (Grant)'
            ELSE 'Free Trial'
          END as entitlement_status,
          
          -- Stripe information
          s.stripe_customer_id,
          s.subscribed,
          s.subscription_tier,
          s.subscription_end,
          s.grace_period_end,
          
          -- Attorney information
          a.display_name as attorney_display_name,
          a.firm_name as attorney_firm,
          
          -- Usage statistics
          COALESCE(
            (SELECT SUM(session_duration_seconds) 
             FROM interview_sessions 
             WHERE user_id = au.id), 0
          ) as lifetime_session_seconds,
          
          mb.session_seconds_used,
          mb.session_seconds_limit,
          
          -- Last session
          (SELECT MAX(created_at) 
           FROM interview_sessions 
           WHERE user_id = au.id
          ) as last_session_at,
          
          -- Grant information
          (SELECT end_at_utc 
           FROM admin_entitlement_grants 
           WHERE user_id = au.id AND end_at_utc > now() 
           ORDER BY end_at_utc DESC 
           LIMIT 1
          ) as grant_end_at,
          
          (SELECT COUNT(*) 
           FROM admin_entitlement_grants 
           WHERE user_id = au.id
          ) as grant_history_count,
          
          -- Auth methods
          ARRAY(
            SELECT DISTINCT am.provider 
            FROM auth.identities am 
            WHERE am.user_id = au.id
          ) as auth_methods
          
        FROM auth.users au
        LEFT JOIN profiles p ON p.user_id = au.id
        LEFT JOIN subscribers s ON s.user_id = au.id
        LEFT JOIN attorneys a ON a.id = s.attorney_id
        LEFT JOIN minutes_balance mb ON mb.user_id = au.id
      )
      SELECT 
        user_id,
        email,
        COALESCE(display_name, legal_name, preferred_name, 'No name') as name,
        entitlement_status,
        CASE WHEN subscribed THEN 'Active' ELSE 'None' END as subscription_status,
        subscription_tier,
        subscription_end,
        ROUND(lifetime_session_seconds / 60.0, 2) as lifetime_minutes,
        ROUND(GREATEST(0, session_seconds_limit - session_seconds_used) / 60.0, 2) as free_minutes_remaining,
        attorney_display_name,
        attorney_firm,
        CASE 
          WHEN grant_end_at IS NOT NULL THEN 
            ROUND(EXTRACT(EPOCH FROM (grant_end_at - now())) / 86400, 1) || ' days'
          ELSE 'None'
        END as grant_remaining,
        grant_history_count,
        array_to_string(auth_methods, ', ') as auth_methods,
        CASE WHEN is_banned THEN 'Yes' ELSE 'No' END as is_banned,
        created_at,
        last_sign_in_at,
        last_session_at,
        ROUND(EXTRACT(EPOCH FROM (now() - created_at)) / 86400, 1) as member_age_days
      FROM user_enriched
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Apply same filters as main query
    if (search) {
      query += ` AND (
        LOWER(display_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(legal_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(preferred_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(email) LIKE LOWER($${paramIndex}) OR
        LOWER(attorney_display_name) LIKE LOWER($${paramIndex}) OR
        LOWER(attorney_firm) LIKE LOWER($${paramIndex})
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'free_trial') {
        query += ` AND entitlement_status = 'Free Trial'`;
      } else if (statusFilter === 'full_prep') {
        query += ` AND entitlement_status LIKE 'Full Prep%'`;
      } else if (statusFilter === 'subscribed') {
        query += ` AND subscribed = true`;
      } else if (statusFilter === 'banned') {
        query += ` AND is_banned = true`;
      }
    }

    if (attorneyFilter && attorneyFilter !== 'all') {
      query += ` AND attorney_id = $${paramIndex}`;
      queryParams.push(attorneyFilter);
      paramIndex++;
    }

    if (dateFrom) {
      query += ` AND created_at >= $${paramIndex}`;
      queryParams.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      query += ` AND created_at <= $${paramIndex}`;
      queryParams.push(dateTo);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    // Execute query to get all matching users
    const { data: users, error: queryError } = await supabase.rpc('exec_sql', {
      sql: query,
      params: queryParams
    });

    if (queryError) {
      console.error('Export query error:', queryError);
      return new Response(JSON.stringify({ error: "Database query failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to CSV
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ error: "No data to export" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    
    for (const user of users) {
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