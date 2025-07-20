
-- Add is_active column to stories table
ALTER TABLE public.stories ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false;

-- Create unique constraint to ensure only one active story per user
CREATE UNIQUE INDEX idx_stories_one_active_per_user 
ON public.stories (user_id) 
WHERE is_active = true;

-- Create function to handle active story switching
CREATE OR REPLACE FUNCTION public.set_active_story(story_id uuid, user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First, deactivate all stories for the user
  UPDATE public.stories 
  SET is_active = false, updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Then activate the specified story
  UPDATE public.stories 
  SET is_active = true, updated_at = now()
  WHERE id = story_id AND user_id = user_id_param;
END;
$$;

-- Update validate_session_inputs function to check for active story
CREATE OR REPLACE FUNCTION public.validate_session_inputs(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  missing_fields text[] := '{}';
  active_story_exists boolean := false;
  profile_complete boolean := false;
BEGIN
  -- Check if user has an active asylum story
  SELECT EXISTS (
    SELECT 1 FROM public.stories 
    WHERE user_id = p_user_id 
    AND is_active = true
    AND story_text IS NOT NULL 
    AND length(trim(story_text)) > 0
  ) INTO active_story_exists;
  
  IF NOT active_story_exists THEN
    missing_fields := array_append(missing_fields, 'active asylum story');
  END IF;
  
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
$function$;
