-- Add prompt_type enum for categorizing prompts
CREATE TYPE prompt_type AS ENUM ('interview_conduct', 'feedback_generation');

-- Add new columns to prompts table
ALTER TABLE public.prompts 
ADD COLUMN prompt_type prompt_type DEFAULT 'interview_conduct',
ADD COLUMN prompt_variables jsonb DEFAULT '{}',
ADD COLUMN description text;

-- Create interview_sessions table to track complete interview sessions
CREATE TABLE public.interview_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  persona_id uuid,
  skills_selected text[],
  language text DEFAULT 'en',
  full_transcript text,
  session_duration_seconds integer,
  user_context jsonb,
  prompt_version_used uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on interview_sessions
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for interview_sessions
CREATE POLICY "Users can view their own interview sessions"
ON public.interview_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interview sessions"
ON public.interview_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview sessions"
ON public.interview_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interview sessions"
ON public.interview_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Add foreign key reference to interview_sessions in feedback table
ALTER TABLE public.feedback 
ADD COLUMN interview_session_id uuid REFERENCES public.interview_sessions(id);

-- Create trigger for interview_sessions updated_at
CREATE TRIGGER update_interview_sessions_updated_at
BEFORE UPDATE ON public.interview_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin prompts for interview conduct and feedback generation
INSERT INTO public.prompts (name, content, prompt_type, is_active, created_by, description, prompt_variables) VALUES
('Default Interview Conduct', 'You are an asylum interview officer conducting a practice interview. Your role is to simulate a real asylum interview experience.

Context:
- User''s asylum story: {{user_story}}
- User''s country of persecution: {{country_of_persecution}}
- Focus skills: {{skills_selected}}
- Officer personality: {{persona_mood}}
- Language: {{language}}

Instructions:
1. Conduct the interview professionally and thoroughly
2. Ask relevant questions about the user''s asylum claim
3. Focus on the selected skills: {{skills_selected}}
4. Adapt your questioning style to match the {{persona_mood}} persona
5. Probe for details and consistency in their story
6. Be respectful but thorough in your questioning
7. Respond in {{language}} language

Begin by welcoming the user and starting the interview process.', 'interview_conduct', true, (SELECT id FROM auth.users LIMIT 1), 'Default prompt for conducting asylum practice interviews', '{"user_story": "User''s asylum story text", "country_of_persecution": "Country name", "skills_selected": "Array of skills to focus on", "persona_mood": "Officer personality/mood", "language": "Interview language"}'),

('Default Feedback Generation', 'You are an expert asylum interview evaluator. Analyze the following interview transcript and provide detailed feedback.

Context:
- User''s asylum story: {{user_story}}
- Selected skills focus: {{skills_selected}}
- Officer persona: {{persona_mood}}
- Interview transcript: {{transcript}}

Evaluation Criteria:
1. **Story Clarity** (1-10): How clearly did the user explain their asylum claim?
2. **Consistency** (1-10): How consistent were the user''s answers throughout?
3. **Detail Provision** (1-10): Did the user provide sufficient specific details?
4. **Emotional Appropriateness** (1-10): Were emotional responses appropriate to the content?
5. **Question Handling** (1-10): How well did the user handle difficult questions?

Please provide:
- Overall score (1-10)
- Strengths (array of specific positive observations)
- Improvements (array of specific areas for improvement)
- Detailed analysis of performance in each selected skill area

Focus particularly on: {{skills_selected}}

Respond in JSON format with: {"score": number, "strengths": [], "improvements": [], "detailed_analysis": ""}', 'feedback_generation', true, (SELECT id FROM auth.users LIMIT 1), 'Default prompt for generating interview feedback', '{"user_story": "User''s asylum story text", "skills_selected": "Array of skills to focus on", "persona_mood": "Officer personality/mood", "transcript": "Full interview transcript"}');