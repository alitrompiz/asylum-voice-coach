-- Create prompts table for admin management
CREATE TABLE public.prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(name, version)
);

-- Enable RLS
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for admins only
CREATE POLICY "Admins can manage prompts" 
ON public.prompts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prompts_updated_at
BEFORE UPDATE ON public.prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get admin user stats
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE(
  active_users_7d INTEGER,
  minutes_used_today INTEGER,
  total_users INTEGER,
  avg_minutes_per_user NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(DISTINCT user_id) FROM feedback WHERE created_at >= NOW() - INTERVAL '7 days')::INTEGER as active_users_7d,
    (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (updated_at - created_at))/60), 0) FROM feedback WHERE created_at >= CURRENT_DATE)::INTEGER as minutes_used_today,
    (SELECT COUNT(*) FROM profiles)::INTEGER as total_users,
    (SELECT COALESCE(AVG(balance_minutes), 0) FROM minutes_balance)::NUMERIC as avg_minutes_per_user;
END;
$$;

-- Insert some sample prompts
INSERT INTO public.prompts (name, content, is_active, created_by) VALUES 
  ('Interview Opening', 'Welcome to your asylum interview practice session. I will be conducting a thorough review of your case. Please state your full name and country of origin.', true, '550e8400-e29b-41d4-a716-446655440000'),
  ('Evidence Review', 'Let''s review the evidence you have provided. Please explain the documents you have submitted and their relevance to your case.', true, '550e8400-e29b-41d4-a716-446655440000'),
  ('Credibility Assessment', 'I need to assess the credibility of your testimony. Please provide specific dates, locations, and details about the events you described.', true, '550e8400-e29b-41d4-a716-446655440000');