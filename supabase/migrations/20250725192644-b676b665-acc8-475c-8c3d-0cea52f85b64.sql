-- Create table for storing session phrases
CREATE TABLE public.session_phrases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phrase_type TEXT NOT NULL CHECK (phrase_type IN ('good', 'cut_short')),
  phrase_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.session_phrases ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Admins can manage session phrases" 
ON public.session_phrases 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create table for storing session settings
CREATE TABLE public.session_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.session_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Admins can manage session settings" 
ON public.session_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default session settings
INSERT INTO public.session_settings (setting_key, setting_value, description, updated_by) VALUES
('max_session_length_minutes', 30, 'Maximum session length in minutes', (SELECT auth.uid())),
('inactivity_alert_seconds', 45, 'Inactivity alert threshold in seconds', (SELECT auth.uid())),
('session_cutshort_threshold_seconds', 60, 'Session cut-short threshold in seconds (used for phrase selection)', (SELECT auth.uid()));

-- Insert default phrases
INSERT INTO public.session_phrases (phrase_type, phrase_text, created_by) VALUES
('good', 'Great work! You completed a full practice session.', (SELECT auth.uid())),
('good', 'Excellent! You made it through the entire session.', (SELECT auth.uid())),
('good', 'Well done! You stayed focused throughout the session.', (SELECT auth.uid())),
('good', 'Fantastic! You completed the full interview practice.', (SELECT auth.uid())),
('good', 'Outstanding! You engaged with the full session.', (SELECT auth.uid())),
('cut_short', 'Session ended early. Every practice counts!', (SELECT auth.uid())),
('cut_short', 'Short session, but still valuable practice time.', (SELECT auth.uid())),
('cut_short', 'Brief session completed. Progress is progress!', (SELECT auth.uid())),
('cut_short', 'Quick practice session finished.', (SELECT auth.uid())),
('cut_short', 'Short but focused practice time completed.', (SELECT auth.uid()));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_session_phrases_updated_at
BEFORE UPDATE ON public.session_phrases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_settings_updated_at
BEFORE UPDATE ON public.session_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();