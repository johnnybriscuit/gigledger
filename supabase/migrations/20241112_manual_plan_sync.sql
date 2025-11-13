-- Manual plan sync for existing subscriptions
-- Run this to sync your plan if the webhook hasn't fired yet

-- Update profiles based on active subscriptions
UPDATE profiles
SET plan = CASE 
  WHEN s.tier = 'monthly' THEN 'pro_monthly'::user_plan
  WHEN s.tier = 'yearly' THEN 'pro_yearly'::user_plan
  ELSE 'free'::user_plan
END
FROM subscriptions s
WHERE profiles.id = s.user_id
  AND s.status = 'active';

-- Show updated profiles
SELECT 
  p.id,
  p.email,
  p.plan,
  s.tier,
  s.status,
  s.current_period_end
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
WHERE s.status = 'active'
ORDER BY p.created_at DESC;
