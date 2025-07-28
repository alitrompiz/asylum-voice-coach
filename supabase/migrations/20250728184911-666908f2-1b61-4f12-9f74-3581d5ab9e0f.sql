-- Create admin function to get all users with enhanced data
CREATE OR REPLACE FUNCTION public.get_all_users_admin(
    search_term text DEFAULT NULL,
    status_filter text DEFAULT 'all',
    page_offset integer DEFAULT 0,
    page_limit integer DEFAULT 20
)
RETURNS TABLE(
    user_id uuid,
    email text,
    display_name text,
    is_banned boolean,
    entitlement_status text,
    subscription_status text,
    has_active_grant boolean,
    has_active_subscription boolean,
    created_at timestamp with time zone,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    total_users bigint;
BEGIN
    -- Check if caller is admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get total count first
    SELECT COUNT(*)
    INTO total_users
    FROM auth.users au
    WHERE (search_term IS NULL OR 
           au.email ILIKE '%' || search_term || '%' OR
           COALESCE((au.raw_user_meta_data ->> 'display_name'), '') ILIKE '%' || search_term || '%');

    -- Return paginated results with enhanced data
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email,
        COALESCE(p.display_name, au.raw_user_meta_data ->> 'display_name', 'No name') as display_name,
        COALESCE(p.is_banned, false) as is_banned,
        CASE 
            WHEN user_has_active_entitlement(au.id) THEN 'full_prep'
            ELSE 'free_trial'
        END as entitlement_status,
        CASE 
            WHEN s.subscribed = true AND (
                s.subscription_end IS NULL OR 
                s.subscription_end > now() OR
                (s.grace_period_end IS NOT NULL AND s.grace_period_end > now())
            ) THEN 'Active'
            ELSE 'None'
        END as subscription_status,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM admin_entitlement_grants aeg
                WHERE aeg.user_id = au.id AND aeg.end_at_utc > now()
            ) THEN true
            ELSE false
        END as has_active_grant,
        CASE 
            WHEN s.subscribed = true AND (
                s.subscription_end IS NULL OR 
                s.subscription_end > now() OR
                (s.grace_period_end IS NOT NULL AND s.grace_period_end > now())
            ) THEN true
            ELSE false
        END as has_active_subscription,
        au.created_at,
        total_users as total_count
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    LEFT JOIN public.subscribers s ON s.user_id = au.id
    WHERE (search_term IS NULL OR 
           au.email ILIKE '%' || search_term || '%' OR
           COALESCE(p.display_name, au.raw_user_meta_data ->> 'display_name', '') ILIKE '%' || search_term || '%')
    ORDER BY au.created_at DESC
    LIMIT page_limit
    OFFSET page_offset;
END;
$$;

-- Function to backfill missing profiles
CREATE OR REPLACE FUNCTION public.backfill_missing_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Insert profiles for users who don't have them
    INSERT INTO public.profiles (user_id, display_name)
    SELECT 
        au.id,
        COALESCE(au.raw_user_meta_data ->> 'display_name', 'User')
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE p.user_id IS NULL;

    -- Also ensure minutes balance exists
    INSERT INTO public.minutes_balance (user_id, session_seconds_used, session_seconds_limit)
    SELECT 
        au.id,
        0,
        3600 -- 60 minutes default
    FROM auth.users au
    LEFT JOIN public.minutes_balance mb ON mb.user_id = au.id
    WHERE mb.user_id IS NULL;
END;
$$;