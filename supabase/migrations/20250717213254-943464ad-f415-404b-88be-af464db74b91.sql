
-- Add a column to store the TTS voice for each persona
ALTER TABLE personas 
ADD COLUMN tts_voice TEXT DEFAULT 'alloy' 
CHECK (tts_voice IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'));

-- Update existing personas with a default voice
UPDATE personas SET tts_voice = 'alloy' WHERE tts_voice IS NULL;
