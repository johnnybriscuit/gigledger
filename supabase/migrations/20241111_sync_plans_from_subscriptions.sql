-- Sync plans from subscriptions table to profiles table
-- This fixes cases where the webhook didn't update the plan

-- Update to pro_monthly for active monthly subscriptions
UPDATE profiles
SET plan = 'pro_monthly'
WHERE id IN (
  SELECT p.id 
  FROM profiles p
  JOIN subscriptions s ON p.id = s.user_id
  WHERE s.status = 'active' 
    AND s.tier = 'monthly'
    AND p.plan != 'pro_monthly'
);

-- Update to pro_yearly for active yearly subscriptions
UPDATE profiles
SET plan = 'pro_yearly'
WHERE id IN (
  SELECT p.id 
  FROM profiles p
  JOIN subscriptions s ON p.id = s.user_id
  WHERE s.status = 'active' 
    AND s.tier = 'yearly'
    AND p.plan != 'pro_yearly'
);

-- Reset to free for canceled/expired subscriptions
UPDATE profiles
SET plan = 'free'
WHERE id IN (
  SELECT p.id 
  FROM profiles p
  LEFT JOIN subscriptions s ON p.id = s.user_id
  WHERE (s.status IS NULL OR s.status IN ('canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid'))
    AND p.plan != 'free'
);

-- Show results
SELECT 
  p.id,
  p.email,
  p.plan,
  s.tier,
  s.status
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
ORDER BY p.created_at DESC
LIMIT 10;
