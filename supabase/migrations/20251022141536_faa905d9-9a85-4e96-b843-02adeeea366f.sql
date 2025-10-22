-- Create home_page_content table for admin-editable landing page content
CREATE TABLE public.home_page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.home_page_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public landing page)
CREATE POLICY "Anyone can view home page content"
  ON public.home_page_content
  FOR SELECT
  USING (true);

-- Only admins can manage content
CREATE POLICY "Admins can manage home page content"
  ON public.home_page_content
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial content
INSERT INTO public.home_page_content (section_key, content) VALUES
  ('hero_h1', 'Prepare for Your Asylum Interview'),
  ('hero_p1', 'Practice with AI-powered voice coaching to build confidence and improve your asylum interview skills'),
  ('officer_picker_title', 'Who do you want to practice with today?');