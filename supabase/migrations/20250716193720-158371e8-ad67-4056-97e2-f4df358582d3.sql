-- Add is_banned field to profiles table
ALTER TABLE public.profiles ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT false;

-- Create admin_actions table for audit logging
CREATE TABLE public.admin_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_actions
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_actions - only admins can access
CREATE POLICY "Admins can manage admin actions" 
ON public.admin_actions 
FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_admin_actions_target_user ON public.admin_actions(target_user_id);
CREATE INDEX idx_admin_actions_admin_user ON public.admin_actions(admin_user_id);
CREATE INDEX idx_admin_actions_created_at ON public.admin_actions(created_at);