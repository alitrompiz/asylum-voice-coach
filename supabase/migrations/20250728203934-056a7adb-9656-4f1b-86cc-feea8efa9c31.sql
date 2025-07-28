-- Fix the get_admin_stats function to work with current schema
CREATE OR REPLACE FUNCTION public.get_admin_stats()
 RETURNS TABLE(active_users_7d integer, minutes_used_today integer, total_users integer, avg_minutes_per_user numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(DISTINCT user_id) FROM feedback WHERE created_at >= NOW() - INTERVAL '7 days')::INTEGER as active_users_7d,
    (SELECT COALESCE(SUM(session_duration_seconds)/60, 0) FROM interview_sessions WHERE created_at >= CURRENT_DATE)::INTEGER as minutes_used_today,
    (SELECT COUNT(*) FROM profiles)::INTEGER as total_users,
    (SELECT COALESCE(AVG(session_seconds_limit::numeric/60), 0) FROM minutes_balance)::NUMERIC as avg_minutes_per_user;
END;
$function$