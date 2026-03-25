-- Add plan column to profiles table for tiered pricing
-- Plans: 'free' (default), 'pro_monthly', 'pro_yearly'

-- Create plan type enum
DO $$ BEGIN
    CREATE TYPE user_plan AS ENUM ('free', 'pro_monthly', 'pro_yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add plan column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan user_plan DEFAULT 'free';

-- Create index for plan queries
CREATE INDEX IF NOT EXISTS profiles_plan_idx ON profiles(plan);

-- Add comment
COMMENT ON COLUMN profiles.plan IS 'User subscription plan: free (20 gig limit, no exports), pro_monthly (unlimited), pro_yearly (unlimited)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Plan column added to profiles table!';
    RAISE NOTICE '   - Default: free (20 gig limit)';
    RAISE NOTICE '   - Pro plans: pro_monthly, pro_yearly (unlimited)';
END $$;
