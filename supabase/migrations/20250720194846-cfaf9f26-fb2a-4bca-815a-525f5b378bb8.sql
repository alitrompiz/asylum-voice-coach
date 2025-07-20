-- Update the check constraint to allow 'manual' as a valid source_type
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_source_type_check;
ALTER TABLE public.stories ADD CONSTRAINT stories_source_type_check CHECK (source_type IN ('pdf', 'text', 'manual'));

-- Make title field nullable since it's no longer required
ALTER TABLE public.stories ALTER COLUMN title DROP NOT NULL;