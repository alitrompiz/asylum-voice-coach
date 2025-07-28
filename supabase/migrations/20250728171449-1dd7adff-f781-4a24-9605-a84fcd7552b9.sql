-- Create attorneys table for referral tracking
CREATE TABLE public.attorneys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  firm_name TEXT NOT NULL,
  coupon_code TEXT UNIQUE,
  ref_is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attorneys ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (for typeahead)
CREATE POLICY "Anyone can view active attorneys" 
ON public.attorneys 
FOR SELECT 
USING (ref_is_active = true);

-- Create policy for admin management
CREATE POLICY "Admins can manage attorneys" 
ON public.attorneys 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create subscribers table for subscription tracking
CREATE TABLE public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT DEFAULT 'free',
  subscription_end TIMESTAMP WITH TIME ZONE,
  grace_period_end TIMESTAMP WITH TIME ZONE,
  attorney_id UUID REFERENCES public.attorneys(id),
  coupon_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies for subscribers
CREATE POLICY "Users can view their own subscription" 
ON public.subscribers 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription" 
ON public.subscribers 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own subscription" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Edge functions can manage subscriptions" 
ON public.subscribers 
FOR ALL 
USING (true);

-- Create admin_settings table for configurable values
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admin management
CREATE POLICY "Admins can manage settings" 
ON public.admin_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add tier_access column to personas table
ALTER TABLE public.personas 
ADD COLUMN tier_access TEXT[] DEFAULT ARRAY['free', 'full'];

-- Add tier_access column to skills table
ALTER TABLE public.skills 
ADD COLUMN tier_access TEXT[] DEFAULT ARRAY['free', 'full'];

-- Repurpose minutes_balance for session time tracking
ALTER TABLE public.minutes_balance 
RENAME COLUMN balance_minutes TO session_seconds_used;

ALTER TABLE public.minutes_balance 
ADD COLUMN session_seconds_limit INTEGER DEFAULT 600; -- 10 minutes = 600 seconds

-- Create conversion_events table for manual tracking
CREATE TABLE public.conversion_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'signup', 'initial_conversion', 'renewal'
  attorney_id UUID REFERENCES public.attorneys(id),
  coupon_code TEXT,
  amount INTEGER, -- in cents
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admins can view conversion events" 
ON public.conversion_events 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default admin settings
INSERT INTO public.admin_settings (setting_key, setting_value, description) VALUES
('free_minutes_cap_seconds', '600', 'Free tier session time limit in seconds'),
('monthly_price_cents', '19900', 'Monthly subscription price in cents'),
('stripe_price_id', 'price_placeholder', 'Stripe price ID for monthly subscription'),
('terms_content', 'Terms and conditions content here', 'Terms and conditions text'),
('refunds_content', 'Refund policy content here', 'Refund policy text');

-- Seed attorneys data
INSERT INTO public.attorneys (display_name, firm_name, coupon_code, ref_is_active) VALUES
('Ira J. Kurzban', 'Kurzban Kurzban Tetzeli & Pratt, P.A.', 'ATTY_KURZBAN_20', true),
('Helena M. Tetzeli', 'Kurzban Kurzban Tetzeli & Pratt, P.A.', 'ATTY_TETZELI_20', true),
('Shaune D. Fraser', 'Fraser Immigration Law, PLLC', 'ATTY_FRASER_20', true),
('Steven A. Goldstein', 'Pozo Goldstein, LLP', 'ATTY_GOLDSTEIN_20', true),
('David F. Vedder', 'David F. Vedder, P.A.', 'ATTY_VEDDER_20', true),
('Enrique J. Núñez Elorza', 'Law Office of Diaz & Núñez Elorza, P.A.', 'ATTY_NUNEZ_20', true),
('Jennie Diaz', 'Law Office of Diaz & Núñez Elorza, P.A.', 'ATTY_DIAZ_20', true),
('Antonio G. Revilla III', 'Revilla Law Firm, P.A.', 'ATTY_REVILLA_20', true),
('Martha L. Arias', 'Arias & Villa (Martha L. Arias, Esq.)', 'ATTY_ARIAS_20', true),
('Larry S. Rifkin', 'Rifkin & Fox-Isicoff, P.A.', 'ATTY_RIFKIN_20', true);

-- Update personas to set tier access (only "Officer Kevin Daniels" for free)
UPDATE public.personas 
SET tier_access = ARRAY['full'] 
WHERE name != 'Officer Kevin Daniels';

UPDATE public.personas 
SET tier_access = ARRAY['free', 'full'] 
WHERE name = 'Officer Kevin Daniels';

-- Update skills to set tier access (only "Describe past harm" for free)
UPDATE public.skills 
SET tier_access = ARRAY['full'] 
WHERE name != 'Describe past harm';

UPDATE public.skills 
SET tier_access = ARRAY['free', 'full'] 
WHERE name = 'Describe past harm';

-- Create trigger for updated_at columns
CREATE TRIGGER update_attorneys_updated_at
BEFORE UPDATE ON public.attorneys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at
BEFORE UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();