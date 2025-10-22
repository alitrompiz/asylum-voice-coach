-- Create guest_sessions table for tracking all guest activity
CREATE TABLE public.guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_token TEXT NOT NULL UNIQUE,
  guest_name TEXT,
  
  -- Session metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  session_started_at TIMESTAMPTZ, -- When interview actually started
  session_ended_at TIMESTAMPTZ,   -- When interview ended
  session_duration_seconds INTEGER,
  
  -- Story information
  story_source TEXT CHECK (story_source IN ('upload', 'paste', 'mock')),
  story_text TEXT,
  story_first_name TEXT,
  story_last_name TEXT,
  selected_test_story_id UUID REFERENCES test_stories(id) ON DELETE SET NULL,
  story_file_path TEXT, -- If uploaded as PDF
  
  -- Interview selections
  selected_persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  selected_language TEXT DEFAULT 'en',
  selected_skills TEXT[], -- Array of skill names
  
  -- Interview data
  full_transcript TEXT,
  
  -- Feedback data
  feedback_requested BOOLEAN DEFAULT false,
  feedback_email TEXT, -- Email they provide to receive feedback
  feedback_sent_at TIMESTAMPTZ,
  ai_feedback JSONB, -- Store the generated feedback
  
  -- Conversion tracking
  converted_to_user_id UUID,
  converted_at TIMESTAMPTZ,
  conversion_email TEXT -- Email used to create account
);

-- Create indexes for performance
CREATE INDEX idx_guest_sessions_created_at ON public.guest_sessions(created_at DESC);
CREATE INDEX idx_guest_sessions_guest_token ON public.guest_sessions(guest_token);
CREATE INDEX idx_guest_sessions_converted ON public.guest_sessions(converted_to_user_id);
CREATE INDEX idx_guest_sessions_feedback_email ON public.guest_sessions(feedback_email);

-- Enable Row Level Security
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can view guest sessions
CREATE POLICY "Admins can view all guest sessions"
  ON public.guest_sessions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage (for edge functions)
CREATE POLICY "Service role can manage guest sessions"
  ON public.guest_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Helper function to convert UTC to EST
CREATE OR REPLACE FUNCTION public.convert_to_est(utc_timestamp TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT utc_timestamp AT TIME ZONE 'America/New_York';
$$;