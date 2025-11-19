# Security Hardening Phase 2 - Implementation Status

## ✅ COMPLETED

### A. Strong Password Policy ✅

**Client-side validation:**
- ✅ `src/lib/passwordValidation.ts` - Validation logic
  - Min 10 characters
  - Must contain letter + number
  - Strength calculation (weak/fair/good/strong)
  - Bonus points for uppercase, lowercase, special chars
  - Penalty for common patterns

- ✅ `src/components/PasswordStrengthMeter.tsx` - Visual meter
  - Color-coded strength bar (red → yellow → green)
  - Real-time strength label
  - Accessible error messages (aria-live)
  - Helpful suggestions

- ✅ `src/screens/AuthScreen.tsx` - Integration
  - Password validation on signup
  - Strength meter shown while typing
  - Updated placeholder: "Min 10 characters, letter + number"
  - Accessible hints
  - Focus kept in field on error

**Server-side validation:**
- ✅ `validatePasswordServer()` function
  - Double-checks password requirements
  - Returns clear error messages
  - Used in API endpoints

### B. Rate-Limited Auth Endpoints ✅

**Rate limiting utility:**
- ✅ `src/lib/rateLimit.ts`
  - 5 requests per 10 minutes per IP+email
  - Upstash Redis support (with in-memory fallback)
  - Privacy-preserving (hashes IP/email for storage)
  - Structured logging
  - Auto-cleanup of expired entries

**API endpoints:**
- ✅ `api/auth/send-magic-link.ts`
  - Proxies to Supabase `signInWithOtp()`
  - Rate limiting: 5 req / 10 min
  - Optional Turnstile verification (server-side only)
  - Returns 429 on rate limit exceeded
  - Returns 403 with `ANTIBOT_FAILED` code if Turnstile fails
  - Structured logging (event, ipHash, emailHash, result)

- ✅ `api/auth/signup-password.ts`
  - Proxies to Supabase `signUp()`
  - Server-side password validation
  - Rate limiting: 5 req / 10 min
  - Optional Turnstile verification (server-side only)
  - Returns 400 with `WEAK_PASSWORD` code for invalid passwords
  - Returns 429 on rate limit exceeded
  - Returns 403 with `ANTIBOT_FAILED` code if Turnstile fails
  - Structured logging

**Features:**
- ✅ No Turnstile UI widget (server-side only)
- ✅ Reads `cf-turnstile-token` from request headers
- ✅ Verifies with Cloudflare when `EXPO_PUBLIC_ANTIBOT_ENABLED=true`
- ✅ Privacy-preserving logging (hashed IPs/emails)
- ✅ Graceful fallback to in-memory rate limiting

---

## ⏳ REMAINING WORK

### C. Fix user_tax_profile 406 Error
**Status**: Pending

**Requirements:**
- Replace `.single()` with `.maybeSingle()`
- Create default profile if null
- Remove console noise

**Files to search:**
```bash
# Find all .single() calls on user_tax_profile
grep -r "user_tax_profile.*single()" src/
```

**Implementation:**
```typescript
// Before
const { data } = await supabase
  .from('user_tax_profile')
  .select('*')
  .eq('user_id', userId)
  .single(); // ❌ Throws 406 if no rows

// After
const { data } = await supabase
  .from('user_tax_profile')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle(); // ✅ Returns null if no rows

if (!data) {
  // Insert default or use in-memory defaults
  const defaults = {
    filing_status: 'single',
    federal_rate: 0.12,
    state_rate: 0.05,
    // ... other defaults
  };
  // Either insert or just use defaults in memory
}
```

### D. Tests & Logging
**Status**: Partially complete (logging done, tests pending)

**Completed:**
- ✅ Structured logging in all API endpoints
- ✅ Privacy-preserving (hashed IPs/emails)
- ✅ Event types: `ratelimit_allowed`, `ratelimit_blocked`, `antibot_success`, `antibot_failed`, etc.

**Pending:**
- ⏳ Unit tests for password validator
- ⏳ Integration tests for rate limiting
- ⏳ Tests for Turnstile verification

**Test files to create:**
```
tests/
  lib/
    passwordValidation.test.ts
    rateLimit.test.ts
  api/
    send-magic-link.test.ts
    signup-password.test.ts
```

**Test cases needed:**
1. **Password validator:**
   - Valid password (10+ chars, letter + number)
   - Too short (< 10 chars)
   - Missing letter
   - Missing number
   - Strength calculation

2. **Rate limiting:**
   - First request allowed
   - 5th request allowed
   - 6th request blocked (429)
   - Reset after window expires

3. **Turnstile verification:**
   - Missing token (403 with ANTIBOT_FAILED)
   - Invalid token (403 with ANTIBOT_FAILED)
   - Valid token (200)
   - Toggle disabled (bypasses check)

### E. Update AuthScreen to Use New Endpoints
**Status**: Pending

**Current:** AuthScreen calls Supabase directly
**Needed:** AuthScreen calls our API endpoints

**Changes required:**
```typescript
// In AuthScreen.tsx

// Magic link - OLD
await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } });

// Magic link - NEW
await fetch('/api/auth/send-magic-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, redirectTo: SITE_URL + '/auth/callback' }),
});

// Password signup - OLD
await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });

// Password signup - NEW
await fetch('/api/auth/signup-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, redirectTo: SITE_URL + '/auth/callback' }),
});
```

**Error handling:**
```typescript
const response = await fetch('/api/auth/signup-password', { ... });
const data = await response.json();

if (!response.ok) {
  if (data.code === 'RATE_LIMIT_EXCEEDED') {
    setError('Too many attempts. Please try again in 10 minutes.');
  } else if (data.code === 'WEAK_PASSWORD') {
    setPasswordError(data.error);
  } else if (data.code === 'ANTIBOT_FAILED') {
    setError('Verification failed. Please try again.');
  } else {
    setError(data.error || 'An error occurred');
  }
}
```

---

## Configuration

### Environment Variables

**Required:**
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SITE_URL=http://localhost:8090
```

**Optional (Anti-bot):**
```bash
EXPO_PUBLIC_ANTIBOT_ENABLED=false  # Set to 'true' to enable
TURNSTILE_SECRET_KEY=your-secret-key
```

**Optional (Redis):**
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Update .env.local.example

Add to `.env.local.example`:
```bash
# Anti-bot protection (server-side only, no UI widget)
# Set to 'true' to enable Turnstile verification
EXPO_PUBLIC_ANTIBOT_ENABLED=false
TURNSTILE_SECRET_KEY=your-secret-key-here

# Optional: Upstash Redis for distributed rate limiting
# If not set, uses in-memory rate limiting (dev only)
# UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
# UPSTASH_REDIS_REST_TOKEN=your-token-here
```

---

## Acceptance Criteria

### ✅ Completed
- [x] Weak passwords blocked client-side
- [x] Weak passwords blocked server-side
- [x] Password strength meter visible during signup
- [x] API endpoints created for magic link and password signup
- [x] Rate limiting implemented (5 req / 10 min)
- [x] Rate limit returns 429 with clear error
- [x] Anti-bot toggle supported (server-side only)
- [x] Missing/invalid Turnstile token returns 403 with ANTIBOT_FAILED
- [x] Structured logging with hashed IPs/emails

### ⏳ Pending
- [ ] AuthScreen updated to call new API endpoints
- [ ] user_tax_profile 406 error fixed
- [ ] Unit tests for password validator
- [ ] Integration tests for rate limiting
- [ ] Tests for Turnstile verification
- [ ] All existing flows still pass (magic link/password + TOTP)
- [ ] No visual regressions

---

## Next Steps

1. **Update AuthScreen** to call new API endpoints (high priority)
2. **Fix user_tax_profile 406** error (quick win)
3. **Write tests** for password validation and rate limiting
4. **Test end-to-end** with rate limiting enabled
5. **Test anti-bot toggle** with Turnstile enabled
6. **Restart server** to apply all changes

---

## Files Created/Modified

### Created:
- `src/lib/passwordValidation.ts` - Password validation logic
- `src/components/PasswordStrengthMeter.tsx` - Visual strength meter
- `src/lib/rateLimit.ts` - Rate limiting utility
- `api/auth/send-magic-link.ts` - Rate-limited magic link endpoint
- `api/auth/signup-password.ts` - Rate-limited password signup endpoint

### Modified:
- `src/screens/AuthScreen.tsx` - Added password validation and strength meter

### To Modify:
- `src/screens/AuthScreen.tsx` - Update to call new API endpoints
- `.env.local.example` - Add new environment variables
- Files with `user_tax_profile.single()` - Replace with `.maybeSingle()`

---

**Last Updated**: 2025-11-19
**Status**: 2/5 complete (A & B done, C/D/E pending)
**Estimated Remaining**: 2-3 hours
