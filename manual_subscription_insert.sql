-- Manual subscription insert based on Stripe data
-- Run this in Supabase SQL Editor to create your subscription

INSERT INTO subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_price_id,
  tier,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  canceled_at,
  trial_end
) VALUES (
  'dcbcbe49-0692-4dd8-9e6a-46c26cc984a2', -- Your user_id from the webhook
  'cus_TO1babI5aos8lv', -- Customer ID from Stripe
  'sub_1SRFkn1zc5DHhlVtKQUURXz1', -- Subscription ID from Stripe
  'price_1SREuh1zc5DHhlVtxhHYiIwG', -- Monthly price ID
  'monthly', -- Tier
  'active', -- Status
  '2025-11-08T17:16:43Z', -- Period start (from invoice created timestamp)
  '2025-12-08T17:16:43Z', -- Period end (1 month later)
  false, -- Not canceling at period end
  NULL, -- Not canceled
  NULL -- No trial
)
ON CONFLICT (user_id) 
DO UPDATE SET
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  stripe_subscription_id = EXCLUDED.stripe_subscription_id,
  stripe_price_id = EXCLUDED.stripe_price_id,
  tier = EXCLUDED.tier,
  status = EXCLUDED.status,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = NOW();
