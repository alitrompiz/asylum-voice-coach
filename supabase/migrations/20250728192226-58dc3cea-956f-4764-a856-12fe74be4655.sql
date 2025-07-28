-- Create a secure function to execute admin queries with parameters
CREATE OR REPLACE FUNCTION public.exec_admin_user_query(query_text text, query_params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_json jsonb;
    param_count int;
    i int;
    formatted_query text;
BEGIN
    -- Check if caller is admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- This function will be used by edge functions with service role
    -- For now, return empty result as we'll handle the complex queries differently
    RETURN '[]'::jsonb;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.exec_admin_user_query(text, jsonb) TO service_role;