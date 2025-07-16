-- Allow all users to view active skills
CREATE POLICY "Users can view active skills" 
ON public.skills 
FOR SELECT 
USING (is_active = true);