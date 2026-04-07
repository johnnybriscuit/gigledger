-- GigLedger Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE payer_type AS ENUM ('Venue', 'Client', 'Platform', 'Other');
CREATE TYPE expense_category AS ENUM ('Travel', 'Meals', 'Lodging', 'Supplies', 'Marketing', 'Education', 'Software', 'Fees', 'Equipment', 'Other');

-- Payers table
CREATE TABLE payers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type payer_type NOT NULL,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gigs table
CREATE TABLE gigs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES payers(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tips NUMERIC(12,2) NOT NULL DEFAULT 0,
  fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  vendor TEXT NOT NULL,
  description TEXT NOT NULL,
  category expense_category NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mileage table
CREATE TABLE mileage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  purpose TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  miles NUMERIC(10,2) NOT NULL,
  rate NUMERIC(10,2) NOT NULL DEFAULT 0.67,
  total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_payers_user_id ON payers(user_id);
CREATE INDEX idx_gigs_user_id ON gigs(user_id);
CREATE INDEX idx_gigs_date ON gigs(date);
CREATE INDEX idx_gigs_payer_id ON gigs(payer_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_mileage_user_id ON mileage(user_id);
CREATE INDEX idx_mileage_date ON mileage(date);

-- Enable Row Level Security
ALTER TABLE payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payers
CREATE POLICY "Users can view own payers"
  ON payers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payers"
  ON payers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payers"
  ON payers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payers"
  ON payers FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for gigs
CREATE POLICY "Users can view own gigs"
  ON gigs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gigs"
  ON gigs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gigs"
  ON gigs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gigs"
  ON gigs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for expenses
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for mileage
CREATE POLICY "Users can view own mileage"
  ON mileage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mileage"
  ON mileage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mileage"
  ON mileage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mileage"
  ON mileage FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_payers_updated_at BEFORE UPDATE ON payers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gigs_updated_at BEFORE UPDATE ON gigs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mileage_updated_at BEFORE UPDATE ON mileage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for receipts (run in Supabase Dashboard > Storage)
-- Bucket name: receipts
-- Public: false
-- File size limit: 5MB
-- Allowed MIME types: image/*, application/pdf

-- Storage RLS policies (apply in Storage settings)
-- SELECT: (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid)
-- INSERT: (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid)
-- UPDATE: (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid)
-- DELETE: (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid)

-- MFA and security tables
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_code_hash UNIQUE (user_id, code_hash)
);

CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token_hash TEXT NOT NULL,
  device_name TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_device_token UNIQUE (user_id, device_token_hash)
);

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address TEXT NOT NULL,
  failure_type TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  CONSTRAINT unique_email_ip UNIQUE (email, ip_address, failure_type)
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_failures_email ON auth_failures(email);

ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own backup codes"
  ON mfa_backup_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backup codes"
  ON mfa_backup_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backup codes"
  ON mfa_backup_codes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backup codes"
  ON mfa_backup_codes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own trusted devices"
  ON trusted_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trusted devices"
  ON trusted_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trusted devices"
  ON trusted_devices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trusted devices"
  ON trusted_devices FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own security events"
  ON security_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own security events"
  ON security_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION cleanup_expired_trusted_devices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM trusted_devices WHERE expires_at < NOW();
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_auth_failures()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth_failures WHERE last_attempt_at < NOW() - INTERVAL '24 hours';
END;
$$;

CREATE OR REPLACE FUNCTION record_auth_failure(
  p_email TEXT,
  p_ip_address TEXT,
  p_failure_type TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_count INTEGER;
BEGIN
  INSERT INTO auth_failures (email, ip_address, failure_type, attempt_count)
  VALUES (p_email, p_ip_address, p_failure_type, 1)
  ON CONFLICT (email, ip_address, failure_type)
  DO UPDATE SET
    attempt_count = auth_failures.attempt_count + 1,
    last_attempt_at = NOW(),
    blocked_until = CASE
      WHEN auth_failures.attempt_count + 1 >= 10 THEN NOW() + INTERVAL '1 hour'
      WHEN auth_failures.attempt_count + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
      ELSE NULL
    END
  RETURNING attempt_count INTO v_attempt_count;

  RETURN v_attempt_count;
END;
$$;

CREATE OR REPLACE FUNCTION clear_auth_failures(
  p_email TEXT,
  p_ip_address TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth_failures
  WHERE email = p_email AND ip_address = p_ip_address;
END;
$$;

CREATE OR REPLACE FUNCTION is_auth_blocked(
  p_email TEXT,
  p_ip_address TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_blocked BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM auth_failures
    WHERE (email = p_email OR ip_address = p_ip_address)
      AND blocked_until IS NOT NULL
      AND blocked_until > NOW()
  ) INTO v_blocked;

  RETURN v_blocked;
END;
$$;
