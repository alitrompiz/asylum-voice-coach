
-- Add admin role for user atrompiz1@gmail.com
-- First, we need to find the user ID and then insert the admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'atrompiz1@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
