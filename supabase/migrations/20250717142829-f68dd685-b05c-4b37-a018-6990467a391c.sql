
-- Add position column to personas table for sorting
ALTER TABLE public.personas ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

-- Set initial position values based on creation order
UPDATE public.personas 
SET position = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM public.personas
) as subquery
WHERE public.personas.id = subquery.id;

-- Create index for better performance on position ordering
CREATE INDEX idx_personas_position ON public.personas(position);
