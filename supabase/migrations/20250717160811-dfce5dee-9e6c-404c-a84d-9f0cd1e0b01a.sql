-- Add unique constraint on name column and insert skills
-- This migration will fix the skills insertion issue

-- Add unique constraint on name column
ALTER TABLE public.skills ADD CONSTRAINT skills_name_unique UNIQUE (name);

-- Temporarily disable RLS for the insert operation
ALTER TABLE public.skills DISABLE ROW LEVEL SECURITY;

-- Bulk upsert skills with their categories
INSERT INTO public.skills (name, group_name, is_active, sort_order) 
VALUES 
  ('Describe past harm', 'Case Strength', true, 1),
  ('Explain violent events', 'Case Strength', true, 2),
  ('Explain delay in applying', 'Credibility', true, 3),
  ('Respond to disbelief', 'Credibility', true, 4),
  ('Show fear of returning', 'Case Strength', true, 5),
  ('Address time in other countries', 'Credibility', true, 6),
  ('Explain why YOU were targeted', 'Case Strength', true, 7),
  ('Improve Story clarity', 'Clarity', true, 8),
  ('Story consistency', 'Credibility', true, 9),
  ('Prove lack of protection', 'Case Strength', true, 10),
  ('Recall dates and places', 'Credibility', true, 11),
  ('Elaborate details', 'Credibility', true, 12),
  ('Handle doubt', 'Credibility', true, 13),
  ('Talk about sensitive events', 'Case Strength', true, 14),
  ('Fix contradictions', 'Consistency', true, 15),
  ('Internal Relocation', 'Case Strength', true, 16)
ON CONFLICT (name) 
DO UPDATE SET 
  group_name = EXCLUDED.group_name,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Re-enable RLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;