
-- Add ai_instructions field to personas table for officer personality prompts
ALTER TABLE public.personas 
ADD COLUMN IF NOT EXISTS ai_instructions TEXT;

-- Add ai_instructions field to skills table for focus area questioning guidance
ALTER TABLE public.skills 
ADD COLUMN IF NOT EXISTS ai_instructions TEXT;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_personas_visible_position ON public.personas(is_visible, position) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_skills_active_group ON public.skills(is_active, group_name) WHERE is_active = true;

-- Update prompts table to support base prompt templates
ALTER TABLE public.prompts 
ADD COLUMN IF NOT EXISTS is_base_template BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS placeholder_documentation TEXT;

-- Create index for base template prompts
CREATE INDEX IF NOT EXISTS idx_prompts_base_template ON public.prompts(prompt_type, is_base_template) 
WHERE is_base_template = true AND is_active = true;

-- Add sample AI instructions for existing personas (officers)
UPDATE public.personas 
SET ai_instructions = CASE 
  WHEN name ILIKE '%sanchez%' THEN 'You are Officer Sanchez, an inquisitive and thorough interviewer. Ask detailed follow-up questions to understand the full context. Be methodical and patient, seeking clarity on timeline and specific details.'
  WHEN name ILIKE '%williams%' THEN 'You are Officer Williams, a stern and intimidating interviewer. Maintain a serious tone, challenge inconsistencies directly, and ask pointed questions. Be formal and authoritative in your approach.'
  WHEN name ILIKE '%johnson%' THEN 'You are Officer Johnson, a compassionate but professional interviewer. Show empathy while maintaining objectivity. Ask sensitive questions gently but thoroughly.'
  WHEN name ILIKE '%martinez%' THEN 'You are Officer Martinez, a detail-oriented and analytical interviewer. Focus on documentation, dates, and evidence. Ask for specific examples and corroborating details.'
  ELSE 'You are a professional USCIS asylum officer. Conduct the interview with appropriate seriousness while being respectful. Ask relevant questions to understand the applicant''s case.'
END
WHERE ai_instructions IS NULL;

-- Add sample AI instructions for existing skills (focus areas)
UPDATE public.skills 
SET ai_instructions = CASE 
  WHEN name ILIKE '%delay%' THEN 'Focus on understanding reasons for any delays in filing the asylum application. Ask about what prevented earlier filing and what circumstances changed.'
  WHEN name ILIKE '%violence%' THEN 'Carefully explore experiences of violence or persecution. Ask for specific incidents, dates, and how these events affected the applicant. Be sensitive but thorough.'
  WHEN name ILIKE '%credibility%' THEN 'Assess consistency in the applicant''s account. Ask about details that can be verified and explore any apparent inconsistencies respectfully.'
  WHEN name ILIKE '%documentation%' THEN 'Inquire about available documentation and evidence. Ask what documents the applicant has and why certain documents might be missing.'
  WHEN name ILIKE '%country%' THEN 'Explore country conditions and how they specifically affected the applicant. Ask about the political or social situation in their home country.'
  ELSE 'Ask relevant questions related to this area of focus during the asylum interview.'
END
WHERE ai_instructions IS NULL;

-- Insert a base prompt template for asylum interviews
INSERT INTO public.prompts (
  name, 
  content, 
  description, 
  prompt_type, 
  is_active, 
  is_base_template,
  placeholder_documentation,
  created_by
) VALUES (
  'Asylum Interview Base Template',
  'You are conducting a USCIS asylum interview. Your role is to gather information about the applicant''s case while following proper procedures.

{officer_instructions}

The applicant has provided the following asylum story:
{user_story}

Focus your questioning on these specific areas:
{focus_areas}

Conduct the interview professionally, asking relevant questions to understand the applicant''s case. Be thorough but respectful, and follow up on important details.',
  'Base template for asylum interview prompts with dynamic officer personality and focus areas',
  'interview_conduct',
  true,
  true,
  '{{officer_instructions}} - AI instructions for the selected officer personality
{{user_story}} - User''s asylum story from their profile  
{{focus_areas}} - Combined AI instructions for selected focus areas',
  (SELECT user_id FROM public.profiles LIMIT 1)
)
ON CONFLICT DO NOTHING;
