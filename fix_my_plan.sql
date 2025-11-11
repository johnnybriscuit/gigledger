-- Check current plan status
SELECT 
  p.id,
  p.email,
  p.plan,
  s.tier,
  s.status,
  s.stripe_subscription_id
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
WHERE s.status = 'active'
LIMIT 10;

-- If your plan is still 'free' but you have an active subscription,
-- run this to manually update it:
-- 
-- UPDATE profiles
-- SET plan = 'pro_monthly'
-- WHERE id IN (
--   SELECT p.id 
--   FROM profiles p
--   JOIN subscriptions s ON p.id = s.user_id
--   WHERE s.status = 'active' 
--     AND s.tier = 'monthly'
--     AND p.plan = 'free'
-- );
-- 
-- UPDATE profiles
-- SET plan = 'pro_yearly'
-- WHERE id IN (
--   SELECT p.id 
--   FROM profiles p
--   JOIN subscriptions s ON p.id = s.user_id
--   WHERE s.status = 'active' 
--     AND s.tier = 'yearly'
--     AND p.plan = 'free'
-- );
