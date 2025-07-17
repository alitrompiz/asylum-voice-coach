-- Create function to assign admin role to users
CREATE OR REPLACE FUNCTION public.assign_admin_role(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert admin role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Create function to remove admin role from users
CREATE OR REPLACE FUNCTION public.remove_admin_role(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_roles 
  WHERE user_id = _user_id AND role = 'admin';
END;
$$;

-- Create function to check if any admin exists
CREATE OR REPLACE FUNCTION public.has_any_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'
  )
$$;

-- Allow authenticated users to call assign_admin_role only if no admin exists
CREATE POLICY "Allow admin role assignment when no admin exists"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'admin' AND 
  user_id = auth.uid() AND 
  NOT public.has_any_admin()
);