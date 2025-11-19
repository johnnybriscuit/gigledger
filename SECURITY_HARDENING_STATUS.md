# Security Hardening Implementation Status

## Overview
Comprehensive security hardening for GigLedger's hybrid auth system (Magic Link + Email/Password) with TOTP MFA.

---

## ✅ COMPLETED

### 1. Email Verification Gate
**Status**: ✅ Complete

**What was built:**
- `CheckEmailScreen.tsx` - Verification waiting screen
- Auto-polling every 5 seconds to check verification status
- Manual "I've verified my email" button
- Resend verification email functionality
- Helpful troubleshooting tips

**Implementation:**
- Added to `App.tsx` routing
- Blocks all app access until `user.email_confirmed_at` is present
- Routes to `/check-email` for unverified users
- Automatically redirects to dashboard after verification

**Files modified:**
- `src/screens/CheckEmailScreen.tsx` (new)
- `App.tsx` (added email verification check)

---

## 🔄 IN PROGRESS / REMAINING

### 2. Strong Password Policy
**Status**: ⏳ Pending

**Requirements:**
- Minimum 10 characters
- At least 1 letter + 1 number
- Client-side password strength meter
- Server-side validation (double-check)
- Reject weak passwords with helpful hints

**Implementation plan:**
```typescript
// Add to AuthScreen.tsx
const validatePasswordStrength = (password: string) => {
  const minLength = 10;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (password.length < minLength) return { valid: false, message: 'At least 10 characters' };
  if (!hasLetter) return { valid: false, message: 'Include at least one letter' };
  if (!hasNumber) return { valid: false, message: 'Include at least one number' };
  
  return { valid: true, strength: calculateStrength(password) };
};

// Add password strength meter component
<PasswordStrengthMeter password={password} />
```

**Files to modify:**
- `src/screens/AuthScreen.tsx` (add validation)
- `src/components/PasswordStrengthMeter.tsx` (new component)
- `api/auth/signup.ts` (server-side validation)

---

### 3. Rate Limiting + Server-Side Turnstile
**Status**: ⏳ Pending

**Requirements:**
- Create `/api/auth/send-magic-link` endpoint
- Create `/api/auth/signup` endpoint
- IP + email rate limiting: 5 requests / 10 min
- Use Upstash Redis (or in-memory for dev)
- Optional Turnstile verification (no UI widget)
- Read `cf-turnstile-token` from request headers

**Implementation plan:**
```typescript
// api/auth/send-magic-link.ts
export default async function handler(req, res) {
  const { email } = req.body;
  const ip = req.headers['x-forwarded-for'];
  
  // Check rate limit
  if (!await checkRateLimit(ip, email)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  // Optional Turnstile check
  if (process.env.EXPO_PUBLIC_ANTIBOT_ENABLED === 'true') {
    const token = req.headers['cf-turnstile-token'];
    if (!await verifyTurnstile(token)) {
      return res.status(403).json({ error: 'Verification failed' });
    }
  }
  
  // Proxy to Supabase
  const { error } = await supabase.auth.signInWithOtp({ email });
  // ...
}
```

**Files to create:**
- `api/auth/send-magic-link.ts`
- `api/auth/signup.ts`
- `src/lib/rateLimit.ts` (helper)

**Files to modify:**
- `src/screens/AuthScreen.tsx` (call new endpoints)
- `.env.local.example` (add Upstash vars)

---

### 4. Session Management
**Status**: ⏳ Pending

**Requirements:**
- Create `user_sessions` table
- Track: user_id, session_id, UA, IP, created_at, last_seen
- Store session on login success (after MFA)
- Update `last_seen` on requests
- UI in Account > Security to list/revoke sessions
- "Sign out all other sessions" button

**Database migration:**
```sql
create table user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  session_id text not null,
  user_agent text,
  ip_address text,
  created_at timestamptz default now(),
  last_seen timestamptz default now(),
  unique(user_id, session_id)
);

create index idx_user_sessions_user_id on user_sessions(user_id);
create index idx_user_sessions_last_seen on user_sessions(last_seen);

alter table user_sessions enable row level security;

create policy "Users can view own sessions"
  on user_sessions for select
  using (user_id = auth.uid());

create policy "Users can delete own sessions"
  on user_sessions for delete
  using (user_id = auth.uid());
```

**Files to create:**
- `supabase/migrations/20251119_add_user_sessions.sql`
- `src/screens/SecuritySettingsScreen.tsx` (session management UI)
- `src/lib/sessionTracking.ts` (helper functions)

---

### 5. New Login Alerts
**Status**: ⏳ Pending

**Requirements:**
- Send email after first successful session on new device
- Include: device info, approximate location, timestamp
- Use Supabase Edge Function or Vercel Function

**Implementation plan:**
```typescript
// supabase/functions/new-login-alert/index.ts
Deno.serve(async (req) => {
  const { userId, device, ip } = await req.json();
  
  // Get user email
  const { data: user } = await supabase.auth.admin.getUserById(userId);
  
  // Get approximate location from IP
  const location = await getLocationFromIP(ip);
  
  // Send email
  await sendEmail({
    to: user.email,
    subject: 'New sign-in to your GigLedger account',
    body: `New sign-in detected on ${device} from ${location} at ${new Date()}`
  });
});
```

**Files to create:**
- `supabase/functions/new-login-alert/index.ts`
- Call from session tracking logic

---

### 6. Magic Link Hardening
**Status**: ⏳ Pending

**Requirements:**
- Set short expiry (15-30 min) in Supabase Auth settings
- Ensure single-use (Supabase default)
- Show friendly retry CTA for expired links
- Handle expired/used links in `/auth/callback`

**Implementation:**
1. Update Supabase Auth settings:
   - Go to Authentication → Email Templates
   - Set OTP expiry to 1800 seconds (30 min)

2. Update `AuthCallbackScreen.tsx`:
```typescript
if (error?.message?.includes('expired') || error?.message?.includes('used')) {
  setError('This link has expired or been used. Please request a new one.');
}
```

**Files to modify:**
- `src/screens/AuthCallbackScreen.tsx` (better error handling)
- Supabase Dashboard settings (manual)

---

### 7. Security Headers
**Status**: ⏳ Pending

**Requirements:**
- Content-Security-Policy
- Strict-Transport-Security
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy
- Secure + HttpOnly + SameSite=Lax cookies

**Implementation:**
```typescript
// middleware.ts (for Next.js) or vercel.json
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://*.supabase.co https://api.stripe.com;"
  );
  
  response.headers.set('Strict-Transport-Security', 
    'max-age=31536000; includeSubDomains; preload'
  );
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=()'
  );
  
  return response;
}
```

**Files to create/modify:**
- `middleware.ts` (new, for Next.js)
- `vercel.json` (add headers section)

---

### 8. RLS Audit
**Status**: ⏳ Pending

**Requirements:**
- Enable RLS on all user-owned tables
- Add policies: `user_id = auth.uid()`
- Verify no cross-tenant data leaks

**Tables to audit:**
- `gigs`
- `expenses`
- `mileage`
- `payers`
- `profiles`
- `user_sessions`
- `user_tax_profile`
- `exports`
- Any other user-owned tables

**Migration template:**
```sql
-- Enable RLS
alter table gigs enable row level security;

-- Policy for own rows
create policy "Users can manage own gigs"
  on gigs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

**Files to create:**
- `supabase/migrations/20251119_rls_audit.sql`

---

### 9. Fix 406 Error (user_tax_profile)
**Status**: ⏳ Pending

**Requirements:**
- Replace `.single()` with `.maybeSingle()`
- Insert default profile if null
- Remove console noise

**Implementation:**
```typescript
// Before
const { data, error } = await supabase
  .from('user_tax_profile')
  .select('*')
  .eq('user_id', userId)
  .single(); // ❌ Throws 406 if no rows

// After
const { data, error } = await supabase
  .from('user_tax_profile')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle(); // ✅ Returns null if no rows

if (!data) {
  // Insert default profile
  await supabase.from('user_tax_profile').insert({
    user_id: userId,
    // ... default values
  });
}
```

**Files to search/modify:**
- Search for `.single()` calls on `user_tax_profile`
- Update to `.maybeSingle()` with null handling

---

### 10. Testing & Documentation
**Status**: ⏳ Pending

**QA Checklist:**
- [ ] Password sign-up blocked until email verified
- [ ] Magic link sends rate-limited (429 on abuse)
- [ ] Optional Turnstile server check blocks spam
- [ ] Session recorded after auth + MFA
- [ ] Sessions appear in Account > Security
- [ ] Can revoke one/all sessions
- [ ] New login email delivered
- [ ] CSP/HSTS headers present
- [ ] Cookies are Secure/HttpOnly/Lax
- [ ] All user tables enforce RLS
- [ ] Cross-account reads fail
- [ ] user_tax_profile 406 resolved

**Documentation to create:**
- Security best practices guide
- Rate limiting configuration
- Session management guide
- RLS policy reference

---

## Environment Variables

### Required
```bash
EXPO_PUBLIC_SITE_URL=http://localhost:8090
EXPO_PUBLIC_ANTIBOT_ENABLED=false
TURNSTILE_SECRET_KEY=your-secret-key
```

### Optional (for production)
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

---

## Implementation Priority

1. ✅ **Email verification gate** (COMPLETE)
2. 🔴 **Password policy** (High priority - user-facing)
3. 🔴 **Rate limiting** (High priority - security)
4. 🟡 **Fix 406 error** (Medium priority - UX improvement)
5. 🟡 **RLS audit** (Medium priority - security)
6. 🟡 **Security headers** (Medium priority - security)
7. 🟢 **Session management** (Low priority - nice-to-have)
8. 🟢 **New login alerts** (Low priority - nice-to-have)
9. 🟢 **Magic link hardening** (Low priority - Supabase handles most)

---

## Next Steps

1. **Immediate**: Implement password policy with strength meter
2. **Next**: Create rate-limiting API endpoints
3. **Then**: Fix 406 error and audit RLS
4. **Finally**: Add security headers and session management

---

**Last Updated**: 2025-11-19
**Status**: 1/10 complete (Email verification gate)
**Estimated Remaining Work**: 6-8 hours
