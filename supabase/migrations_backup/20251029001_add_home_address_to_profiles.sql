-- Add home_address column to profiles table for automatic mileage calculation

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS home_address TEXT;

COMMENT ON COLUMN profiles.home_address IS 'User home address for automatic mileage calculation from home to gig venue';
