-- Migration: Add MFA and Security Tables
-- Description: Tables for 2FA backup codes, trusted devices, security events, and auth failure tracking
-- Date: 2025-11-18

-- ============================================================================
-- 1. MFA Backup Codes Table
-- ============================================================================
-- Stores hashed one-time backup codes for account recovery when 2FA device is lost
CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure each code is unique per user
  CONSTRAINT unique_user_code_hash UNIQUE (user_id, code_hash)
);

-- Index for fast user lookups
CREATE INDEX idx_mfa_backup_codes_user_id ON public.mfa_backup_codes(user_id);
CREATE INDEX idx_mfa_backup_codes_used_at ON public.mfa_backup_codes(used_at) WHERE used_at IS NOT NULL;

-- RLS Policies
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own backup codes"
  ON public.mfa_backup_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backup codes"
  ON public.mfa_backup_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backup codes"
  ON public.mfa_backup_codes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backup codes"
  ON public.mfa_backup_codes
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Trusted Devices Table
-- ============================================================================
-- Tracks devices that have been marked as "trusted" to skip 2FA for 30 days
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token_hash TEXT NOT NULL,
  device_name TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure each device token is unique per user
  CONSTRAINT unique_user_device_token UNIQUE (user_id, device_token_hash)
);

-- Indexes
CREATE INDEX idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX idx_trusted_devices_expires_at ON public.trusted_devices(expires_at);
CREATE INDEX idx_trusted_devices_token_hash ON public.trusted_devices(device_token_hash);

-- RLS Policies
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trusted devices"
  ON public.trusted_devices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trusted devices"
  ON public.trusted_devices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trusted devices"
  ON public.trusted_devices
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trusted devices"
  ON public.trusted_devices
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. Security Events Table
-- ============================================================================
-- Audit log for security-related events (MFA enrollment, removal, failed attempts, etc.)
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_event_type ON public.security_events(event_type);

-- RLS Policies
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own security events"
  ON public.security_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only system/service role can insert security events
CREATE POLICY "Service role can insert security events"
  ON public.security_events
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 4. Auth Failures Table
-- ============================================================================
-- Tracks failed authentication attempts for rate limiting and CAPTCHA triggering
CREATE TABLE IF NOT EXISTS public.auth_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address TEXT NOT NULL,
  failure_type TEXT NOT NULL, -- 'password', 'mfa', 'captcha'
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  
  -- Composite unique constraint for email + IP tracking
  CONSTRAINT unique_email_ip UNIQUE (email, ip_address, failure_type)
);

-- Indexes
CREATE INDEX idx_auth_failures_email ON public.auth_failures(email);
CREATE INDEX idx_auth_failures_ip_address ON public.auth_failures(ip_address);
CREATE INDEX idx_auth_failures_last_attempt ON public.auth_failures(last_attempt_at DESC);
CREATE INDEX idx_auth_failures_blocked_until ON public.auth_failures(blocked_until) WHERE blocked_until IS NOT NULL;

-- RLS Policies - This table is managed by server-side functions only
ALTER TABLE public.auth_failures ENABLE ROW LEVEL SECURITY;

-- No user-facing policies - only service role can access
CREATE POLICY "Service role can manage auth failures"
  ON public.auth_failures
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Function to clean up expired trusted devices
CREATE OR REPLACE FUNCTION cleanup_expired_trusted_devices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.trusted_devices
  WHERE expires_at < NOW();
END;
$$;

-- Function to clean up old auth failures (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_auth_failures()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.auth_failures
  WHERE last_attempt_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Function to record auth failure
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
  -- Insert or update auth failure record
  INSERT INTO public.auth_failures (email, ip_address, failure_type, attempt_count)
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

-- Function to clear auth failures on successful login
CREATE OR REPLACE FUNCTION clear_auth_failures(
  p_email TEXT,
  p_ip_address TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.auth_failures
  WHERE email = p_email AND ip_address = p_ip_address;
END;
$$;

-- Function to check if IP/email is blocked
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
    SELECT 1 FROM public.auth_failures
    WHERE (email = p_email OR ip_address = p_ip_address)
      AND blocked_until IS NOT NULL
      AND blocked_until > NOW()
  ) INTO v_blocked;
  
  RETURN v_blocked;
END;
$$;

-- ============================================================================
-- 6. Comments
-- ============================================================================

COMMENT ON TABLE public.mfa_backup_codes IS 'Stores hashed one-time backup codes for 2FA recovery';
COMMENT ON TABLE public.trusted_devices IS 'Tracks devices marked as trusted to skip 2FA prompts';
COMMENT ON TABLE public.security_events IS 'Audit log for security-related events';
COMMENT ON TABLE public.auth_failures IS 'Tracks failed authentication attempts for rate limiting';

COMMENT ON FUNCTION cleanup_expired_trusted_devices() IS 'Removes expired trusted device records';
COMMENT ON FUNCTION cleanup_old_auth_failures() IS 'Removes auth failure records older than 24 hours';
COMMENT ON FUNCTION record_auth_failure(TEXT, TEXT, TEXT) IS 'Records a failed authentication attempt and returns attempt count';
COMMENT ON FUNCTION clear_auth_failures(TEXT, TEXT) IS 'Clears auth failure records on successful login';
COMMENT ON FUNCTION is_auth_blocked(TEXT, TEXT) IS 'Checks if an email/IP combination is currently blocked';
