
-- Add columns to prompts table for better tracking and validation
ALTER TABLE public.prompts 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS prompt_type TEXT NOT NULL DEFAULT 'interview_conduct' 
  CHECK (prompt_type IN ('interview_conduct', 'feedback_generation')),
ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS template_variables TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending' 
  CHECK (validation_status IN ('pending', 'validated', 'needs_review'));

-- Update existing records to have proper prompt_type
UPDATE public.prompts 
SET prompt_type = 'interview_conduct' 
WHERE prompt_type IS NULL OR prompt_type = '';

-- Create index for better performance on active prompts
CREATE INDEX IF NOT EXISTS idx_prompts_active_type ON public.prompts(prompt_type, is_active) 
WHERE is_active = true;

-- Create prompt_usage_logs table for tracking
CREATE TABLE IF NOT EXISTS public.prompt_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  interview_session_id UUID,
  user_id UUID NOT NULL,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('interview_conduct', 'feedback_generation')),
  variables_used JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on prompt_usage_logs
ALTER TABLE public.prompt_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for prompt usage logs (admins can view all)
CREATE POLICY "Admins can manage prompt usage logs" 
ON public.prompt_usage_logs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to increment prompt usage
CREATE OR REPLACE FUNCTION public.increment_prompt_usage(prompt_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.prompts 
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE id = prompt_id;
END;
$$;

-- Create function to get active prompt by type
CREATE OR REPLACE FUNCTION public.get_active_prompt_by_type(p_type TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  content TEXT,
  template_variables TEXT[],
  version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.content, p.template_variables, p.version
  FROM public.prompts p
  WHERE p.prompt_type = p_type 
    AND p.is_active = true
  ORDER BY p.updated_at DESC
  LIMIT 1;
END;
$$;

-- Create function to validate prompt template variables
CREATE OR REPLACE FUNCTION public.validate_prompt_template(content TEXT, required_vars TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  var TEXT;
  missing_vars TEXT[] := '{}';
BEGIN
  -- Check if all required variables are present in content
  FOREACH var IN ARRAY required_vars
  LOOP
    IF content !~ ('{{' || var || '}}') THEN
      missing_vars := array_append(missing_vars, var);
    END IF;
  END LOOP;
  
  -- Return true if no missing variables
  RETURN array_length(missing_vars, 1) IS NULL;
END;
$$;
