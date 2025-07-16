-- Add is_active column to skills table
ALTER TABLE public.skills ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Insert some sample skills data for testing
INSERT INTO public.skills (name, group_name, is_active, sort_order) VALUES
  ('Communication', 'Core Skills', true, 1),
  ('Active Listening', 'Core Skills', true, 2),
  ('Public Speaking', 'Core Skills', true, 3),
  ('Storytelling', 'Interview Skills', true, 4),
  ('Memory Recall', 'Interview Skills', true, 5),
  ('Emotional Control', 'Interview Skills', true, 6),
  ('Legal Knowledge', 'Legal Skills', true, 7),
  ('Document Review', 'Legal Skills', true, 8),
  ('Evidence Presentation', 'Legal Skills', true, 9),
  ('Cultural Awareness', 'Personal Skills', true, 10),
  ('Stress Management', 'Personal Skills', true, 11),
  ('Time Management', 'Personal Skills', false, 12);