-- Add onboarding fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_of_feared_persecution TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS asylum_office_filed TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_filed DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interview_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_opted_in BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'not_started';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_status ON public.profiles(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_profiles_language_preference ON public.profiles(language_preference);