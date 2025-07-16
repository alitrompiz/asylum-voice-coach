-- Create personas table
CREATE TABLE public.personas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mood TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can manage personas
CREATE POLICY "Admins can manage personas" 
ON public.personas 
FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_personas_updated_at
BEFORE UPDATE ON public.personas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for persona images
INSERT INTO storage.buckets (id, name, public) VALUES ('persona-images', 'persona-images', true);

-- Create storage policies for persona images
CREATE POLICY "Public access to persona images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'persona-images');

CREATE POLICY "Admins can upload persona images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'persona-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update persona images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'persona-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete persona images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'persona-images' AND has_role(auth.uid(), 'admin'::app_role));