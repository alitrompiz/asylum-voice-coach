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

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_session_phrases_updated_at
BEFORE UPDATE ON public.session_phrases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_settings_updated_at
BEFORE UPDATE ON public.session_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();