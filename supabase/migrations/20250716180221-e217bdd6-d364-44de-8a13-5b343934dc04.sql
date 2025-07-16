-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create transcripts table
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create story_files table
CREATE TABLE public.story_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create minutes_balance table
CREATE TABLE public.minutes_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minutes_balance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for transcripts
CREATE POLICY "Users can view their own transcripts" ON public.transcripts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transcripts" ON public.transcripts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transcripts" ON public.transcripts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcripts" ON public.transcripts
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for story_files
CREATE POLICY "Users can view their own story files" ON public.story_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own story files" ON public.story_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own story files" ON public.story_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own story files" ON public.story_files
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for minutes_balance
CREATE POLICY "Users can view their own minutes balance" ON public.minutes_balance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own minutes balance" ON public.minutes_balance
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own minutes balance" ON public.minutes_balance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own minutes balance" ON public.minutes_balance
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  
  INSERT INTO public.minutes_balance (user_id, balance_minutes)
  VALUES (NEW.id, 60); -- Give new users 60 minutes to start
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transcripts_updated_at
  BEFORE UPDATE ON public.transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_story_files_updated_at
  BEFORE UPDATE ON public.story_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_minutes_balance_updated_at
  BEFORE UPDATE ON public.minutes_balance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for story files
INSERT INTO storage.buckets (id, name, public) VALUES ('story-files', 'story-files', false);

-- Create storage policies for story files
CREATE POLICY "Users can view their own story files" ON storage.objects
  FOR SELECT USING (bucket_id = 'story-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own story files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'story-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own story files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'story-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own story files" ON storage.objects
  FOR DELETE USING (bucket_id = 'story-files' AND auth.uid()::text = (storage.foldername(name))[1]);