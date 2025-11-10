-- Add onboarding_complete column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- Update existing users to have onboarding_complete = true (they've already been using the app)
UPDATE profiles
SET onboarding_complete = TRUE
WHERE onboarding_complete IS NULL OR onboarding_complete = FALSE;
