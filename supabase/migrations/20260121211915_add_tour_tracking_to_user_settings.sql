-- Add tour tracking fields to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS dashboard_tour_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tour_completed_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_tour_completed 
ON user_settings(dashboard_tour_completed);
