-- Add monthly usage tracking columns to profiles table
-- This migration introduces token-based monthly limits for the free tier

-- Add new columns for tracking monthly usage
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gigs_used_this_month INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expenses_used_this_month INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invoices_used_this_month INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exports_used_this_month INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS usage_period_start DATE DEFAULT CURRENT_DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legacy_free_plan BOOLEAN DEFAULT FALSE;

-- Set legacy_free_plan = true for all existing free users
-- This grandfathers them into the old unlimited invoice/export system
UPDATE profiles 
SET legacy_free_plan = TRUE 
WHERE plan = 'free' 
  AND created_at < NOW();

-- Add comment explaining the columns
COMMENT ON COLUMN profiles.gigs_used_this_month IS 'Number of gigs created this month (resets monthly for free tier)';
COMMENT ON COLUMN profiles.expenses_used_this_month IS 'Number of expenses created this month (resets monthly for free tier)';
COMMENT ON COLUMN profiles.invoices_used_this_month IS 'Number of invoices created this month (resets monthly for free tier)';
COMMENT ON COLUMN profiles.exports_used_this_month IS 'Number of exports performed this month (resets monthly for free tier)';
COMMENT ON COLUMN profiles.usage_period_start IS 'Start date of current usage period (typically 1st of month)';
COMMENT ON COLUMN profiles.legacy_free_plan IS 'True if user is on legacy free plan (20 lifetime gigs/expenses, unlimited invoices/exports)';

-- Create index for efficient querying of free users for monthly reset
CREATE INDEX IF NOT EXISTS idx_profiles_free_plan_reset 
ON profiles(plan, legacy_free_plan) 
WHERE plan = 'free' AND legacy_free_plan = FALSE;
