-- Add missing functions for prompt management
CREATE OR REPLACE FUNCTION public.increment_prompt_usage(prompt_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.prompts 
  SET usage_count = COALESCE(usage_count, 0) + 1,
      last_used_at = now()
  WHERE id = prompt_id;
END;
$$;

-- Add missing columns to prompts table if they don't exist
ALTER TABLE public.prompts 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'needs_review'));

-- Create prompt_usage_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.prompt_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  interview_session_id UUID,
  user_id UUID NOT NULL,
  prompt_type TEXT NOT NULL,
  variables_used JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on prompt_usage_logs if not already enabled
ALTER TABLE public.prompt_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for prompt_usage_logs if it doesn't exist
DROP POLICY IF EXISTS "Admins can manage prompt usage logs" ON public.prompt_usage_logs;
CREATE POLICY "Admins can manage prompt usage logs" 
ON public.prompt_usage_logs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Get function for active prompts by type
CREATE OR REPLACE FUNCTION public.get_active_prompt_by_type(p_type TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  content TEXT,
  description TEXT,
  prompt_type prompt_type,
  is_active BOOLEAN,
  version INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.content,
    p.description,
    p.prompt_type,
    p.is_active,
    p.version,
    p.created_at,
    p.updated_at
  FROM public.prompts p
  WHERE p.prompt_type = p_type::prompt_type
    AND p.is_active = true
  ORDER BY p.updated_at DESC
  LIMIT 1;
END;
$$;

-- Validate prompt template function
CREATE OR REPLACE FUNCTION public.validate_prompt_template(content TEXT, required_vars TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  var TEXT;
BEGIN
  FOREACH var IN ARRAY required_vars
  LOOP
    IF content !~ ('{{' || var || '}}') THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  RETURN TRUE;
END;
$$;