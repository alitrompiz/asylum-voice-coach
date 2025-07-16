-- Create scores table to track user performance metrics
CREATE TABLE public.scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credibility INTEGER NOT NULL CHECK (credibility >= 0 AND credibility <= 100),
  story_clarity INTEGER NOT NULL CHECK (story_clarity >= 0 AND story_clarity <= 100),
  case_strength INTEGER NOT NULL CHECK (case_strength >= 0 AND case_strength <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own scores" 
ON public.scores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scores" 
ON public.scores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scores" 
ON public.scores 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scores" 
ON public.scores 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scores_updated_at
BEFORE UPDATE ON public.scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for testing
INSERT INTO public.scores (user_id, credibility, story_clarity, case_strength) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 85, 78, 92),
  ('550e8400-e29b-41d4-a716-446655440000', 88, 82, 89);