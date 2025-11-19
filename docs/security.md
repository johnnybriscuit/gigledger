# GigLedger Security: 2FA + CAPTCHA Implementation

## Overview

GigLedger now includes comprehensive security features:
- **TOTP 2FA** (Time-based One-Time Password) using authenticator apps
- **Cloudflare Turnstile CAPTCHA** for bot protection
- **Backup codes** for account recovery
- **Trusted devices** to reduce friction
- **Security event logging** for audit trails
- **Rate limiting** on failed authentication attempts

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [User Flows](#user-flows)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Security Best Practices](#security-best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Setup & Configuration

### 1. Environment Variables

Add these to your `.env.local` and Vercel environment:

```bash
# Supabase (already configured)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Cloudflare Turnstile
EXPO_PUBLIC_TURNSTILE_SITE_KEY=your-site-key-here
TURNSTILE_SECRET_KEY=your-secret-key-here

# Optional: Upstash Redis for rate limiting
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### 2. Get Turnstile Keys

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Turnstile
3. Create a new site
4. Choose "Managed" mode for production
5. Add your domains (localhost for dev, your production domain)
6. Copy the Site Key and Secret Key

### 3. Run Database Migrations

```bash
# Apply the MFA security tables migration
supabase db push

# Or manually run:
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20251118_add_mfa_security_tables.sql
```

### 4. Install Dependencies

```bash
npm install
```

New packages added:
- `bcryptjs` - Backup code hashing
- `expo-clipboard` - Copy functionality
- `expo-crypto` - Secure random generation
- `expo-web-browser` - OAuth flows
- `otpauth` - TOTP generation
- `qrcode` - QR code generation
- `react-native-qrcode-svg` - QR display
- `react-native-webview` - Turnstile widget

---

## User Flows

### Signup Flow

1. User enters email + password
2. **Turnstile CAPTCHA** is displayed (required)
3. User completes CAPTCHA
4. Account is created
5. User completes onboarding
6. **Optional**: User is prompted to set up 2FA (can skip)

### Login Flow (No 2FA)

1. User enters email + password
2. If >3 failed attempts: **Turnstile CAPTCHA** appears
3. User signs in successfully

### Login Flow (With 2FA)

1. User enters email + password
2. If >3 failed attempts: **Turnstile CAPTCHA** appears
3. Password verified → Redirect to MFA verification screen
4. User enters 6-digit code from authenticator app
5. Optional: "Remember this device for 30 days"
6. User signs in successfully

### 2FA Enrollment Flow

1. User navigates to Security settings (or prompted after signup)
2. Click "Enable 2-Step Verification"
3. **Step 1**: Scan QR code with authenticator app
   - Apps: Google Authenticator, 1Password, Authy, Microsoft Authenticator
   - Manual entry option available
4. **Step 2**: Enter 6-digit code to verify
5. **Step 3**: Save 10 backup codes
   - Download as .txt file
   - Copy to clipboard
   - Print option
6. 2FA is now active

### Account Recovery

If user loses their phone:
1. Click "Use a backup code instead" on login
2. Enter one of the 10 backup codes
3. Each code works only once
4. User should regenerate codes after recovery

---

## Database Schema

### `mfa_backup_codes`

Stores hashed one-time backup codes.

```sql
CREATE TABLE public.mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `trusted_devices`

Tracks devices that skip 2FA for 30 days.

```sql
CREATE TABLE public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token_hash TEXT NOT NULL,
  device_name TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `security_events`

Audit log for security-related events.

```sql
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Event Types:**
- `signup_success`
- `login_success` / `login_failed`
- `mfa_enrollment_started` / `mfa_enrollment_completed` / `mfa_enrollment_failed`
- `mfa_verification_success` / `mfa_verification_failed`
- `mfa_unenrolled`
- `backup_codes_generated` / `backup_code_used` / `backup_code_failed`
- `trusted_device_added` / `trusted_device_removed`

### `auth_failures`

Tracks failed authentication attempts for rate limiting.

```sql
CREATE TABLE public.auth_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address TEXT NOT NULL,
  failure_type TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ
);
```

---

## API Endpoints

### POST `/api/verify-turnstile`

Verifies Cloudflare Turnstile CAPTCHA tokens.

**Request:**
```json
{
  "token": "turnstile-token-from-widget",
  "remoteip": "optional-user-ip"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "hostname": "your-domain.com",
  "action": "login",
  "timestamp": "2025-11-18T12:00:00Z"
}
```

**Response (Failure):**
```json
{
  "ok": false,
  "error": "Verification failed",
  "errorCodes": ["timeout-or-duplicate"]
}
```

---

## Security Best Practices

### For Users

1. **Use a strong password** (min 12 characters, mixed case, numbers, symbols)
2. **Enable 2FA** as soon as possible
3. **Save backup codes** in a secure location (password manager, encrypted file)
4. **Don't share backup codes** with anyone
5. **Review trusted devices** regularly and remove unknown devices
6. **Use "Remember device"** only on personal devices

### For Developers

1. **Never log sensitive data** (passwords, tokens, backup codes)
2. **Always hash backup codes** with bcrypt (salt rounds: 10)
3. **Verify CAPTCHA server-side** - never trust client-side verification
4. **Rate limit authentication endpoints** to prevent brute force
5. **Use HTTPS only** in production
6. **Rotate Turnstile keys** if compromised
7. **Monitor security events** for suspicious activity
8. **Set proper CORS headers** on API endpoints

### Password Requirements

- Minimum 6 characters (Supabase default)
- Consider increasing to 12+ for better security
- No maximum length (within reason)
- Support special characters

### Session Management

- Sessions expire after inactivity (Supabase default: 1 hour)
- Refresh tokens valid for 30 days
- Trusted device tokens valid for 30 days
- MFA challenges expire after 5 minutes

---

## Troubleshooting

### CAPTCHA Not Loading

**Issue:** Turnstile widget shows "Unable to load verification widget"

**Solutions:**
1. Check `EXPO_PUBLIC_TURNSTILE_SITE_KEY` is set correctly
2. Verify domain is whitelisted in Cloudflare dashboard
3. Check network connectivity
4. Try the fallback "I'm Human" button

### 2FA Code Not Working

**Issue:** 6-digit code is rejected

**Solutions:**
1. Ensure device time is synchronized (TOTP requires accurate time)
2. Try the next code (codes change every 30 seconds)
3. Use a backup code if authenticator is unavailable
4. Contact support to reset 2FA (requires identity verification)

### Backup Codes Not Working

**Issue:** Backup code is rejected

**Solutions:**
1. Ensure code is entered exactly (including dash: `ABCD-EFGH`)
2. Check if code was already used (each works once)
3. Regenerate codes if all are used

### Can't Access Account

**Scenarios:**

1. **Lost phone + no backup codes:**
   - Contact support with identity verification
   - Support can disable 2FA from admin panel

2. **Forgot password + 2FA enabled:**
   - Use password reset flow (email link)
   - 2FA still required after reset

3. **Locked out after failed attempts:**
   - Wait for block to expire (15 min for 5 attempts, 1 hour for 10+)
   - Or contact support to clear block

### Development Issues

**CAPTCHA in development:**
- Use Turnstile test keys for local development
- Test site key: `1x00000000000000000000AA`
- Test secret key: `1x0000000000000000000000000000000AA`

**Database types not updating:**
```bash
npm run supabase:types
```

**Migration errors:**
```bash
# Reset local database
supabase db reset

# Or manually drop tables
DROP TABLE IF EXISTS public.mfa_backup_codes CASCADE;
DROP TABLE IF EXISTS public.trusted_devices CASCADE;
DROP TABLE IF EXISTS public.security_events CASCADE;
DROP TABLE IF EXISTS public.auth_failures CASCADE;
```

---

## Testing

### Manual Testing Checklist

- [ ] Signup with CAPTCHA
- [ ] Login without 2FA
- [ ] Login with 3+ failed attempts (triggers CAPTCHA)
- [ ] Enable 2FA (scan QR, verify code, save backup codes)
- [ ] Login with 2FA (enter 6-digit code)
- [ ] Login with backup code
- [ ] Trust device (skip 2FA for 30 days)
- [ ] Remove trusted device
- [ ] Disable 2FA
- [ ] View security events log

### Automated Testing

```bash
# Run tests (when implemented)
npm test

# Playwright E2E tests
npm run test:e2e
```

---

## Support

For security issues or questions:
- Email: security@gigledger.com
- Documentation: https://docs.gigledger.com/security
- Status: https://status.gigledger.com

**Report security vulnerabilities privately** - do not open public issues.

---

## Changelog

### 2025-11-18 - Initial Release

- ✅ TOTP 2FA with QR code enrollment
- ✅ Backup codes (10 per user)
- ✅ Trusted devices (30-day expiry)
- ✅ Cloudflare Turnstile CAPTCHA
- ✅ Security event logging
- ✅ Rate limiting on failed attempts
- ✅ Account security settings UI
