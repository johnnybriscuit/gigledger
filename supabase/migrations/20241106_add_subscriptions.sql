-- Add subscriptions table to track user subscription status
-- This integrates with Stripe for payment processing

-- Create subscription_status enum
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');
CREATE TYPE subscription_tier AS ENUM ('free', 'monthly', 'yearly');

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe fields
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  
  -- Subscription details
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  
  -- Dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one subscription per user
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = check_user_id
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's subscription tier
CREATE OR REPLACE FUNCTION get_subscription_tier(check_user_id UUID)
RETURNS subscription_tier AS $$
DECLARE
  user_tier subscription_tier;
BEGIN
  SELECT tier INTO user_tier
  FROM subscriptions
  WHERE user_id = check_user_id
  AND status IN ('active', 'trialing')
  AND (current_period_end IS NULL OR current_period_end > NOW());
  
  RETURN COALESCE(user_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE subscriptions IS 'User subscription information linked to Stripe';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at end of current period';
