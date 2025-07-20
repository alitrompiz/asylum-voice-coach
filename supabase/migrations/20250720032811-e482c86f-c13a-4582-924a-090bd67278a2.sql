
-- Create a function to validate session inputs for a specific user
CREATE OR REPLACE FUNCTION public.validate_session_inputs(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  missing_fields text[] := '{}';
  user_story_exists boolean := false;
  persona_selected boolean := false;
  skills_selected boolean := false;
  profile_complete boolean := false;
BEGIN
  -- Check if user has an asylum story
  SELECT EXISTS (
    SELECT 1 FROM public.stories 
    WHERE user_id = p_user_id 
    AND story_text IS NOT NULL 
    AND length(trim(story_text)) > 0
  ) INTO user_story_exists;
  
  IF NOT user_story_exists THEN
    missing_fields := array_append(missing_fields, 'asylum story');
  END IF;
  
  -- Check if user has selected a persona (this will be checked at runtime)
  -- Since persona selection happens during interview setup, we'll handle this in the frontend
  
  -- Check if user has basic profile information
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = p_user_id 
    AND (
      (legal_name IS NOT NULL AND length(trim(legal_name)) > 0) OR
      (preferred_name IS NOT NULL AND length(trim(preferred_name)) > 0) OR
      (display_name IS NOT NULL AND length(trim(display_name)) > 0)
    )
    AND country_of_feared_persecution IS NOT NULL 
    AND length(trim(country_of_feared_persecution)) > 0
  ) INTO profile_complete;
  
  IF NOT profile_complete THEN
    missing_fields := array_append(missing_fields, 'profile information');
  END IF;
  
  -- Return the missing fields as a JSON array
  RETURN jsonb_build_object('missing_fields', to_jsonb(missing_fields));
END;
$function$
