-- Add MFA backup codes, trusted devices, security event logging, and auth failure tracking.
-- This promotes the previously orphaned backup migration into the active schema.

CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_code_hash UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_id ON public.mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_used_at
  ON public.mfa_backup_codes(used_at) WHERE used_at IS NOT NULL;

ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mfa_backup_codes'
      AND policyname = 'Users can view their own backup codes'
  ) THEN
    CREATE POLICY "Users can view their own backup codes"
      ON public.mfa_backup_codes
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mfa_backup_codes'
      AND policyname = 'Users can insert their own backup codes'
  ) THEN
    CREATE POLICY "Users can insert their own backup codes"
      ON public.mfa_backup_codes
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mfa_backup_codes'
      AND policyname = 'Users can update their own backup codes'
  ) THEN
    CREATE POLICY "Users can update their own backup codes"
      ON public.mfa_backup_codes
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mfa_backup_codes'
      AND policyname = 'Users can delete their own backup codes'
  ) THEN
    CREATE POLICY "Users can delete their own backup codes"
      ON public.mfa_backup_codes
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

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
  CONSTRAINT unique_user_device_token UNIQUE (user_id, device_token_hash)
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires_at ON public.trusted_devices(expires_at);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_token_hash ON public.trusted_devices(device_token_hash);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trusted_devices'
      AND policyname = 'Users can view their own trusted devices'
  ) THEN
    CREATE POLICY "Users can view their own trusted devices"
      ON public.trusted_devices
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trusted_devices'
      AND policyname = 'Users can insert their own trusted devices'
  ) THEN
    CREATE POLICY "Users can insert their own trusted devices"
      ON public.trusted_devices
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trusted_devices'
      AND policyname = 'Users can update their own trusted devices'
  ) THEN
    CREATE POLICY "Users can update their own trusted devices"
      ON public.trusted_devices
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trusted_devices'
      AND policyname = 'Users can delete their own trusted devices'
  ) THEN
    CREATE POLICY "Users can delete their own trusted devices"
      ON public.trusted_devices
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'security_events'
      AND policyname = 'Users can view their own security events'
  ) THEN
    CREATE POLICY "Users can view their own security events"
      ON public.security_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'security_events'
      AND policyname = 'Authenticated users can insert their own security events'
  ) THEN
    CREATE POLICY "Authenticated users can insert their own security events"
      ON public.security_events
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.auth_failures (
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

CREATE INDEX IF NOT EXISTS idx_auth_failures_email ON public.auth_failures(email);
CREATE INDEX IF NOT EXISTS idx_auth_failures_ip_address ON public.auth_failures(ip_address);
CREATE INDEX IF NOT EXISTS idx_auth_failures_last_attempt ON public.auth_failures(last_attempt_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_failures_blocked_until
  ON public.auth_failures(blocked_until) WHERE blocked_until IS NOT NULL;

ALTER TABLE public.auth_failures ENABLE ROW LEVEL SECURITY;

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

REVOKE ALL ON FUNCTION cleanup_expired_trusted_devices() FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_old_auth_failures() FROM PUBLIC;
REVOKE ALL ON FUNCTION record_auth_failure(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION clear_auth_failures(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_auth_blocked(TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION cleanup_expired_trusted_devices() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_auth_failures() TO service_role;
GRANT EXECUTE ON FUNCTION record_auth_failure(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION clear_auth_failures(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION is_auth_blocked(TEXT, TEXT) TO service_role;

COMMENT ON TABLE public.mfa_backup_codes IS 'Stores hashed one-time backup codes for MFA recovery';
COMMENT ON TABLE public.trusted_devices IS 'Tracks devices marked as trusted to skip MFA prompts';
COMMENT ON TABLE public.security_events IS 'Audit log for security-related events';
COMMENT ON TABLE public.auth_failures IS 'Tracks failed authentication attempts for rate limiting and lockouts';
