# Security Notes - Bozzy (GigLedger)

## Overview

This document provides operational guidance for managing secrets and API keys in the Bozzy application. Following these practices ensures that sensitive credentials are never exposed in client code or version control.

---

## Environment Variable Strategy

### Client-Side Variables (Safe to Bundle)

Variables prefixed with `EXPO_PUBLIC_*` are bundled into the client application and are visible to end users. Only use this prefix for:

- **Supabase URL** (`EXPO_PUBLIC_SUPABASE_URL`)
- **Supabase Anon Key** (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) - This is a public key with RLS protection
- **Google Maps API Key** (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) - **MUST be restricted** (see below)
- **Feature flags** and **configuration values**
- **Stripe Price IDs** (these are public identifiers)

### Server-Side Variables (NEVER Bundle)

The following secrets must **NEVER** be referenced in client code:

- **Resend API Key** (`RESEND_API_KEY`)
- **Stripe Secret Key** (`STRIPE_SECRET_KEY_PROD`)
- **Stripe Webhook Secret** (`STRIPE_WEBHOOK_SECRET_PROD`)
- **Supabase Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`)

These should only be used in:
- Vercel API routes (`api/*.ts`)
- Supabase Edge Functions (`supabase/functions/*/index.ts`)

---

## API Key Management

### 1. Resend API Key

**Purpose**: Sending transactional emails (invoices, receipts, etc.)

**Storage**:
- **Local Development**: Add to `.env` (gitignored)
- **Supabase Edge Functions**: Use Supabase secrets
  ```bash
  supabase secrets set RESEND_API_KEY=re_xxxxx
  ```
- **Vercel**: Add to Vercel environment variables (if used in API routes)

**Usage**:
- ✅ **Correct**: Call from Supabase Edge Function or Vercel API route
- ❌ **WRONG**: Import or reference in any `src/` client code

**Rotation**: Generate new key at [resend.com/api-keys](https://resend.com/api-keys)

---

### 2. Google Maps API Key

**Purpose**: Geocoding, distance calculation, and place autocomplete

**Storage**:
- Add to `.env` as `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

**CRITICAL SECURITY REQUIREMENT**:
This key is bundled into the client app, so it **MUST** be restricted in Google Cloud Console:

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Select your API key
3. Under "Application restrictions":
   - **For Web**: Set HTTP referrers
     - `https://yourdomain.com/*`
     - `http://localhost:*` (for development)
   - **For iOS**: Set iOS bundle ID
     - `com.yourcompany.bozzy`
   - **For Android**: Set Android package name
     - `com.yourcompany.bozzy`
4. Under "API restrictions": Limit to only required APIs
   - Distance Matrix API
   - Geocoding API
   - Places API

**Rotation**: Generate new key and update restrictions immediately

---

### 3. Supabase Keys

**Supabase URL** (`EXPO_PUBLIC_SUPABASE_URL`):
- ✅ Safe to bundle - this is a public endpoint
- Protected by Row Level Security (RLS) policies

**Supabase Anon Key** (`EXPO_PUBLIC_SUPABASE_ANON_KEY`):
- ✅ Safe to bundle - this is a public key with limited permissions
- Can only access data allowed by RLS policies
- Cannot bypass RLS or access admin functions

**Supabase Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`):
- ❌ **NEVER bundle** - this bypasses all RLS policies
- Only use in server-side code (Vercel API routes)
- Grants full admin access to database

---

### 4. Stripe Keys

**Stripe Secret Key** (`STRIPE_SECRET_KEY_PROD`):
- ❌ **NEVER bundle** - this can create charges and access customer data
- Only use in Vercel API routes (`api/create-checkout.ts`, `api/create-portal.ts`)

**Stripe Webhook Secret** (`STRIPE_WEBHOOK_SECRET_PROD`):
- ❌ **NEVER bundle** - used to verify webhook signatures
- Only use in `api/stripe-webhook.ts`

**Stripe Price IDs** (`EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID_PROD`):
- ✅ Safe to bundle - these are public identifiers
- Used to display pricing and create checkout sessions

---

## File Security Checklist

### Files That Should NEVER Contain Real Secrets

- ✅ `.env.example` - Only placeholders
- ✅ `.env.local.example` - Only placeholders
- ✅ Any file in `src/` - Client code
- ✅ Any file in `components/` - Client code
- ✅ `README.md` or documentation files

### Files That Can Contain Secrets (But Must Be Gitignored)

- ✅ `.env` - **MUST be in .gitignore**
- ✅ `.env.local` - Already in .gitignore via `.env*.local` pattern

### Files That Can Reference Server Secrets

- ✅ `api/*.ts` - Vercel API routes (server-side)
- ✅ `supabase/functions/*/index.ts` - Edge Functions (server-side)

---

## Secret Scanning

Run the automated secret scanner before committing:

```bash
npm run scan:secrets
```

This will scan for common secret patterns:
- Resend API keys (`re_`)
- Google API keys (`AIza`)
- Service role keys
- Hardcoded credentials

**The scanner will fail (exit code 1) if it finds potential secrets in tracked files.**

---

## Incident Response

### If a Secret is Accidentally Committed

1. **Immediately rotate the exposed key**:
   - Resend: Generate new key at [resend.com/api-keys](https://resend.com/api-keys)
   - Google Maps: Generate new key at [console.cloud.google.com](https://console.cloud.google.com/apis/credentials)
   - Stripe: Generate new key at [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
   - Supabase: Reset keys in project settings

2. **Remove from git history**:
   ```bash
   # Use git filter-branch or BFG Repo-Cleaner
   # This is complex - consider creating a new repo if needed
   ```

3. **Update all deployment environments** with new keys:
   - Vercel environment variables
   - Supabase Edge Function secrets
   - Local `.env` files (team members)

4. **Monitor for unauthorized usage** of the old key

---

## Development Workflow

### Setting Up a New Development Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env`

3. **Never commit `.env`** - it's in `.gitignore`

4. For Supabase Edge Functions, set secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxx
   ```

### Before Committing Code

1. Run the secret scanner:
   ```bash
   npm run scan:secrets
   ```

2. Verify `.env` is not staged:
   ```bash
   git status
   ```

3. Review your changes for hardcoded secrets:
   ```bash
   git diff --cached
   ```

---

## Questions?

If you're unsure whether a value should be `EXPO_PUBLIC_*` or server-side only, ask:

1. **Does this value grant access to paid services or user data?**
   - YES → Server-side only
   - NO → Probably safe for client

2. **Would exposing this value allow someone to impersonate the app or cost us money?**
   - YES → Server-side only
   - NO → Probably safe for client

3. **Is this value already public (like a Stripe Price ID or Supabase URL)?**
   - YES → Safe for client
   - NO → Evaluate carefully

**When in doubt, keep it server-side.**

---

## Additional Resources

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [Google Cloud API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
