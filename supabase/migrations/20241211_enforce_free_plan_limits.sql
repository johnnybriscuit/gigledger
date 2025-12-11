-- Enforce free plan limits at the database level via RLS policies
-- This is the last line of defense to prevent bypassing limits via direct API calls

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "limit_free_plan_gigs" ON gigs;
DROP POLICY IF EXISTS "limit_free_plan_expenses" ON expenses;

-- Function to check if user is on free plan
CREATE OR REPLACE FUNCTION is_free_plan(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier subscription_tier;
  user_status subscription_status;
BEGIN
  -- Get user's subscription
  SELECT tier, status INTO user_tier, user_status
  FROM subscriptions
  WHERE user_id = check_user_id;
  
  -- If no subscription found, user is on free plan
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  
  -- If subscription is not active/trialing, treat as free
  IF user_status NOT IN ('active', 'trialing') THEN
    RETURN TRUE;
  END IF;
  
  -- If tier is free, return true
  IF user_tier = 'free' THEN
    RETURN TRUE;
  END IF;
  
  -- Otherwise user has active paid subscription
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy for gigs: Limit free users to 20 gigs
CREATE POLICY "limit_free_plan_gigs"
ON gigs
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- Non-free plans: no limit
    NOT is_free_plan(auth.uid())
    OR
    -- Free plan: allow insert only if current count < 20
    (
      SELECT COUNT(*) FROM gigs g
      WHERE g.user_id = auth.uid()
    ) < 20
  )
);

-- RLS Policy for expenses: Limit free users to 20 expenses
CREATE POLICY "limit_free_plan_expenses"
ON expenses
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- Non-free plans: no limit
    NOT is_free_plan(auth.uid())
    OR
    -- Free plan: allow insert only if current count < 20
    (
      SELECT COUNT(*) FROM expenses e
      WHERE e.user_id = auth.uid()
    ) < 20
  )
);

-- Add helpful comments
COMMENT ON FUNCTION is_free_plan IS 'Returns true if user is on free plan (no subscription or inactive subscription)';
COMMENT ON POLICY "limit_free_plan_gigs" ON gigs IS 'Enforces 20 gig limit for free plan users at database level';
COMMENT ON POLICY "limit_free_plan_expenses" ON expenses IS 'Enforces 20 expense limit for free plan users at database level';
