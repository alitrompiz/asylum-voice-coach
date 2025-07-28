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

    // Build the comprehensive user query with enriched data
    let query = `
      WITH user_enriched AS (
        SELECT 
          au.id as user_id,
          au.email,
          au.created_at,
          au.last_sign_in_at,
          au.app_metadata,
          au.user_metadata,
          p.display_name,
          p.legal_name,
          p.preferred_name,
          p.is_banned,
          p.avatar_url,
          
          -- Entitlement status
          CASE 
            WHEN s.subscribed = true AND (
              s.subscription_end IS NULL OR 
              s.subscription_end > now() OR
              (s.grace_period_end IS NOT NULL AND s.grace_period_end > now())
            ) THEN 'full_prep_subscription'
            WHEN EXISTS (
              SELECT 1 FROM admin_entitlement_grants aeg
              WHERE aeg.user_id = au.id AND aeg.end_at_utc > now()
            ) THEN 'full_prep_grant'
            ELSE 'free_trial'
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
          s.attorney_id,
          
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
          
          -- Auth methods (simplified - could be expanded)
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
      SELECT *,
        -- Calculated fields
        EXTRACT(EPOCH FROM (
          CASE 
            WHEN grant_end_at IS NOT NULL THEN grant_end_at - now()
            ELSE INTERVAL '0'
          END
        )) as grant_remaining_seconds,
        
        GREATEST(0, session_seconds_limit - session_seconds_used) as free_seconds_remaining,
        
        EXTRACT(EPOCH FROM (now() - created_at)) / 86400 as member_age_days,
        
        CASE 
          WHEN entitlement_status LIKE 'full_prep%' THEN
            EXTRACT(EPOCH FROM (now() - COALESCE(
              (SELECT MIN(created_at) FROM subscribers WHERE user_id = user_enriched.user_id AND subscribed = true),
              (SELECT MIN(start_at_utc) FROM admin_entitlement_grants WHERE user_id = user_enriched.user_id),
              now()
            ))) / 86400
          ELSE 0
        END as paid_member_age_days
        
      FROM user_enriched
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add search filter
    if (params.search) {
      query += ` AND (
        LOWER(display_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(legal_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(preferred_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(email) LIKE LOWER($${paramIndex}) OR
        LOWER(attorney_display_name) LIKE LOWER($${paramIndex}) OR
        LOWER(attorney_firm) LIKE LOWER($${paramIndex})
      )`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    // Add status filter
    if (params.status_filter && params.status_filter !== 'all') {
      if (params.status_filter === 'free_trial') {
        query += ` AND entitlement_status = 'free_trial'`;
      } else if (params.status_filter === 'full_prep') {
        query += ` AND entitlement_status LIKE 'full_prep%'`;
      } else if (params.status_filter === 'subscribed') {
        query += ` AND subscribed = true`;
      } else if (params.status_filter === 'banned') {
        query += ` AND is_banned = true`;
      }
    }

    // Add attorney filter
    if (params.attorney_filter && params.attorney_filter !== 'all') {
      query += ` AND attorney_id = $${paramIndex}`;
      queryParams.push(params.attorney_filter);
      paramIndex++;
    }

    // Add date range filter
    if (params.date_from) {
      query += ` AND created_at >= $${paramIndex}`;
      queryParams.push(params.date_from);
      paramIndex++;
    }
    if (params.date_to) {
      query += ` AND created_at <= $${paramIndex}`;
      queryParams.push(params.date_to);
      paramIndex++;
    }

    // Add sorting
    const sortColumn = params.sort_by === 'lifetime_minutes' ? 'lifetime_session_seconds' : 
                      params.sort_by === 'member_age' ? 'member_age_days' :
                      params.sort_by === 'last_active' ? 'last_session_at' :
                      params.sort_by || 'created_at';
    
    query += ` ORDER BY ${sortColumn} ${params.sort_order?.toUpperCase() || 'DESC'} NULLS LAST`;

    // Add pagination
    const offset = ((params.page || 1) - 1) * (params.limit || 20);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(params.limit || 20, offset);

    // Execute the query
    const { data: users, error: queryError } = await supabase.rpc('exec_sql', {
      sql: query,
      params: queryParams
    });

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(JSON.stringify({ error: "Database query failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM auth.users au
      LEFT JOIN profiles p ON p.user_id = au.id
      LEFT JOIN subscribers s ON s.user_id = au.id
      LEFT JOIN attorneys a ON a.id = s.attorney_id
      WHERE 1=1
    `;

    // Apply the same filters for count
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (params.search) {
      countQuery += ` AND (
        LOWER(p.display_name) LIKE LOWER($${countParamIndex}) OR 
        LOWER(p.legal_name) LIKE LOWER($${countParamIndex}) OR 
        LOWER(p.preferred_name) LIKE LOWER($${countParamIndex}) OR 
        LOWER(au.email) LIKE LOWER($${countParamIndex}) OR
        LOWER(a.display_name) LIKE LOWER($${countParamIndex}) OR
        LOWER(a.firm_name) LIKE LOWER($${countParamIndex})
      )`;
      countParams.push(`%${params.search}%`);
      countParamIndex++;
    }

    if (params.attorney_filter && params.attorney_filter !== 'all') {
      countQuery += ` AND s.attorney_id = $${countParamIndex}`;
      countParams.push(params.attorney_filter);
      countParamIndex++;
    }

    if (params.date_from) {
      countQuery += ` AND au.created_at >= $${countParamIndex}`;
      countParams.push(params.date_from);
      countParamIndex++;
    }
    if (params.date_to) {
      countQuery += ` AND au.created_at <= $${countParamIndex}`;
      countParams.push(params.date_to);
      countParamIndex++;
    }

    const { data: countResult } = await supabase.rpc('exec_sql', {
      sql: countQuery,
      params: countParams
    });

    const total = countResult?.[0]?.total || 0;

    return new Response(JSON.stringify({
      users: users || [],
      pagination: {
        page: params.page || 1,
        limit: params.limit || 20,
        total,
        totalPages: Math.ceil(total / (params.limit || 20))
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