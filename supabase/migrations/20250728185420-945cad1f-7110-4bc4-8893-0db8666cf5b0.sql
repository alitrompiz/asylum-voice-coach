-- Set up tier_access for personas and skills if not already configured
-- Update personas - Officer Kevin Daniels should be available for free users
UPDATE public.personas 
SET tier_access = '{"free", "full"}'::text[]
WHERE name ILIKE '%Kevin Daniels%' AND (tier_access IS NULL OR tier_access = '{}');

-- All other personas should be full access only  
UPDATE public.personas 
SET tier_access = '{"full"}'::text[]
WHERE NOT (name ILIKE '%Kevin Daniels%') AND (tier_access IS NULL OR tier_access = '{}');

-- Update skills - "Describe past harm" should be available for free users
UPDATE public.skills 
SET tier_access = '{"free", "full"}'::text[]
WHERE name ILIKE '%Describe past harm%' AND (tier_access IS NULL OR tier_access = '{}');

-- All other skills should be full access only
UPDATE public.skills 
SET tier_access = '{"full"}'::text[]
WHERE NOT (name ILIKE '%Describe past harm%') AND (tier_access IS NULL OR tier_access = '{}');