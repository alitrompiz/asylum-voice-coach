-- Allow all users to view visible personas
CREATE POLICY "Users can view visible personas" 
ON public.personas 
FOR SELECT 
USING (is_visible = true);