-- Create payment_method_details table for storing user payment method information
-- This supports V1 methods: Venmo, Zelle, PayPal, Cash App
-- Schema designed to easily extend for V2 (ACH/Direct Deposit) without breaking changes

CREATE TABLE IF NOT EXISTS payment_method_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('venmo', 'zelle', 'paypal', 'cashapp')),
  details TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, method)
);

-- Create index for faster lookups by user_id
CREATE INDEX idx_payment_method_details_user_id ON payment_method_details(user_id);

-- Enable RLS
ALTER TABLE payment_method_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own payment method details
CREATE POLICY "Users can view own payment methods"
  ON payment_method_details FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods"
  ON payment_method_details FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods"
  ON payment_method_details FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods"
  ON payment_method_details FOR DELETE
  USING (auth.uid() = user_id);

-- Update timestamp trigger
CREATE TRIGGER update_payment_method_details_updated_at
  BEFORE UPDATE ON payment_method_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
