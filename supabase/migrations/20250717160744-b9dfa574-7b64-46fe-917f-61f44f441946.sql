-- Fix skills insertion by temporarily disabling RLS during bulk insert
-- This migration will properly insert the skills data

-- Temporarily disable RLS for the insert operation
ALTER TABLE public.skills DISABLE ROW LEVEL SECURITY;

-- Bulk upsert skills with their categories
INSERT INTO public.skills (name, group_name, is_active, sort_order) 
VALUES 
  ('Describe past harm', 'Case Strength', true, 0),
  ('Explain violent events', 'Case Strength', true, 0),
  ('Explain delay in applying', 'Credibility', true, 0),
  ('Respond to disbelief', 'Credibility', true, 0),
  ('Show fear of returning', 'Case Strength', true, 0),
  ('Address time in other countries', 'Credibility', true, 0),
  ('Explain why YOU were targeted', 'Case Strength', true, 0),
  ('Improve Story clarity', 'Clarity', true, 0),
  ('Story consistency', 'Credibility', true, 0),
  ('Prove lack of protection', 'Case Strength', true, 0),
  ('Recall dates and places', 'Credibility', true, 0),
  ('Elaborate details', 'Credibility', true, 0),
  ('Handle doubt', 'Credibility', true, 0),
  ('Talk about sensitive events', 'Case Strength', true, 0),
  ('Fix contradictions', 'Consistency', true, 0),
  ('Internal Relocation', 'Case Strength', true, 0)
ON CONFLICT (name) 
DO UPDATE SET 
  group_name = EXCLUDED.group_name,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Update sort_order for newly inserted rows to use a high value so they appear at the bottom
UPDATE public.skills 
SET sort_order = EXTRACT(EPOCH FROM created_at)::integer
WHERE sort_order = 0 AND created_at >= now() - interval '1 minute';

-- Re-enable RLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;