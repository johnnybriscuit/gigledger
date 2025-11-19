# John's Staging Setup Checklist

## ⚠️ Required Actions (10 minutes total)

### 1. Vercel Environment Variables (5 min)

Go to: **Vercel Dashboard → gigledger-ten → Settings → Environment Variables**

Add these if not already set:

```bash
# Required
EXPO_PUBLIC_SITE_URL=https://gigledger-ten.vercel.app
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Recommended (for distributed rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**After adding**: Redeploy the app (Vercel will auto-redeploy on env var changes)

---

### 2. Supabase Auth URLs (2 min)

Go to: **Supabase Dashboard → Authentication → URL Configuration**

Set these values:

**Site URL**:
```
https://gigledger-ten.vercel.app
```

**Redirect URLs** (add both):
```
https://gigledger-ten.vercel.app/auth/callback
https://gigledger-ten.vercel.app/*
```

Click **Save**

---

### 3. Test Full Auth Flow (10 min)

1. **Open staging**: https://gigledger-ten.vercel.app
2. **Sign up** with a real email (you'll need to verify)
3. **Check email** → click magic link or confirmation link
4. **Set up MFA** → scan QR code, enter TOTP code
5. **See tax banner** → should show "Set up your tax profile"
6. **Dismiss banner** → click X, refresh page → should stay dismissed
7. **Go to Account → Tax Settings** → save a state
8. **Refresh dashboard** → banner should NOT appear (state is set)

---

### 4. Verify Security Features (5 min)

**Test CSRF** (should fail without token):
```bash
curl -X POST https://gigledger-ten.vercel.app/api/auth/send-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```
Expected: `{"error":"CSRF token validation failed","code":"CSRF_FAILED"}` with HTTP 403 ✅

**Test wrong method** (should fail):
```bash
curl -X GET https://gigledger-ten.vercel.app/api/auth/signup-password
```
Expected: `{"error":"Method not allowed","code":"METHOD_NOT_ALLOWED"}` with HTTP 405 ✅

---

## ✅ Already Complete (No Action Needed)

- ✅ All code uses `EXPO_PUBLIC_SITE_URL`
- ✅ CSRF token fetched on AuthScreen mount
- ✅ CSRF token included in all API requests
- ✅ Tax profile defaults to `state=null`
- ✅ Banner shows/dismisses correctly
- ✅ Rate limiting works (429 on 6th request)
- ✅ Audit logging in place
- ✅ Accessibility features added
- ✅ 41 security tests passing

---

## 📊 Quick Verification

After setting env vars and Supabase URLs, verify:

1. **Magic link works**: Sign in → receive email → click link → redirects to staging
2. **Password signup works**: Create account → verify email → set up MFA
3. **Tax banner appears**: New user sees banner when state is null
4. **Banner dismisses**: Click X → stays dismissed after refresh
5. **Banner disappears**: Save state → banner never shows again

---

## 🚨 If Something Breaks

### Magic link doesn't redirect:
- Check Supabase redirect URLs include `https://gigledger-ten.vercel.app/*`
- Check `EXPO_PUBLIC_SITE_URL` is set in Vercel

### CSRF errors in browser console:
- Check browser can access `/api/csrf-token`
- Check cookies are being set (inspect Network tab)
- Verify same-origin (no cross-domain requests)

### Rate limiting not working:
- Without Redis, it uses in-memory (resets on deploy)
- Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for persistence

### Tax banner doesn't show:
- Check user's tax profile in Supabase (should have `state=null` for new users)
- Check browser localStorage for `tax_banner_dismissed_{userId}`

---

## 📝 Summary

**What you need to do**:
1. Set 3-5 environment variables in Vercel
2. Set 3 URLs in Supabase
3. Test the full flow once

**Time**: ~15-20 minutes total

**Status**: Code is production-ready, just needs config ✅

---

**Questions?** Check `STAGING_VERIFICATION.md` for detailed verification results.
