-- Add story references to profiles table for onboarding flow
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS active_story_id uuid REFERENCES stories(id),
ADD COLUMN IF NOT EXISTS active_test_story_id uuid REFERENCES test_stories(id);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_active_story ON profiles(active_story_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active_test_story ON profiles(active_test_story_id);

-- Add comment for documentation
COMMENT ON COLUMN profiles.active_story_id IS 'Reference to user uploaded/pasted story';
COMMENT ON COLUMN profiles.active_test_story_id IS 'Reference to selected mock test story';