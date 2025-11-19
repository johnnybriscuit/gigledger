# 2FA + CAPTCHA Setup Guide

Quick setup guide for enabling 2FA and CAPTCHA in GigLedger.

## Prerequisites

- Supabase project configured
- Vercel deployment (or local dev environment)
- Cloudflare account (free tier works)

## Step 1: Install Dependencies

```bash
npm install
```

This installs all required packages including:
- `bcryptjs`, `expo-crypto` - Cryptography
- `react-native-qrcode-svg`, `qrcode` - QR codes
- `react-native-webview` - CAPTCHA widget
- `expo-clipboard` - Copy functionality

## Step 2: Get Cloudflare Turnstile Keys

1. Go to https://dash.cloudflare.com/
2. Navigate to **Turnstile** in the sidebar
3. Click **Add Site**
4. Configure:
   - **Site name**: GigLedger
   - **Domain**: Add your domains (e.g., `localhost`, `gigledger.app`)
   - **Widget mode**: Managed (recommended)
5. Click **Create**
6. Copy the **Site Key** and **Secret Key**

## Step 3: Configure Environment Variables

### Local Development (`.env.local`)

```bash
# Add these to your .env.local file
EXPO_PUBLIC_TURNSTILE_SITE_KEY=your-site-key-here
TURNSTILE_SECRET_KEY=your-secret-key-here
```

### Vercel Production

```bash
# Add via Vercel dashboard or CLI
vercel env add EXPO_PUBLIC_TURNSTILE_SITE_KEY
vercel env add TURNSTILE_SECRET_KEY
```

Or use the Vercel dashboard:
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add both variables for Production, Preview, and Development

## Step 4: Run Database Migrations

### Option A: Supabase CLI (Recommended)

```bash
# Push migrations to your Supabase project
supabase db push
```

### Option B: Manual SQL

```bash
# Connect to your database
psql -h db.your-project.supabase.co -U postgres -d postgres

# Run the migration file
\i supabase/migrations/20251118_add_mfa_security_tables.sql
```

### Option C: Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy contents of `supabase/migrations/20251118_add_mfa_security_tables.sql`
4. Paste and run

## Step 5: Update App Configuration

Add Turnstile site key to `app.config.js`:

```javascript
export default {
  expo: {
    // ... existing config
    extra: {
      turnstileSiteKey: process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY,
      // ... other extras
    }
  }
}
```

## Step 6: Test Locally

```bash
# Start the development server
npm run start:web

# Or for mobile
npm run start
```

### Test Checklist

1. **Signup Flow**
   - Navigate to signup
   - Verify CAPTCHA widget appears
   - Complete CAPTCHA and create account

2. **Login Flow**
   - Try logging in with wrong password 3 times
   - Verify CAPTCHA appears after 3 failures
   - Login successfully

3. **2FA Enrollment** (optional but recommended)
   - Navigate to account settings
   - Enable 2FA
   - Scan QR code with authenticator app
   - Verify with 6-digit code
   - Save backup codes

## Step 7: Deploy to Production

```bash
# Deploy to Vercel
vercel --prod

# Or push to main branch (if auto-deploy enabled)
git push origin main
```

## Verification

After deployment, verify:

- [ ] CAPTCHA appears on signup page
- [ ] CAPTCHA appears after failed login attempts
- [ ] 2FA enrollment works (QR code displays)
- [ ] 2FA verification works on login
- [ ] Backup codes can be generated and used
- [ ] Security events are logged in database

## Troubleshooting

### CAPTCHA Not Showing

**Problem**: Widget doesn't appear or shows error

**Solutions**:
1. Check `EXPO_PUBLIC_TURNSTILE_SITE_KEY` is set
2. Verify domain is whitelisted in Cloudflare
3. Check browser console for errors
4. Try Turnstile test keys for development:
   - Site key: `1x00000000000000000000AA`
   - Secret key: `1x0000000000000000000000000000000AA`

### Database Errors

**Problem**: Tables don't exist

**Solutions**:
1. Verify migration ran successfully
2. Check Supabase logs for errors
3. Manually create tables using SQL editor

### TypeScript Errors

**Problem**: Type errors for new tables

**Solutions**:
```bash
# Regenerate database types
npm run supabase:types

# Or manually
supabase gen types typescript --local > src/types/database.types.ts
```

### Module Not Found Errors

**Problem**: Can't find new packages

**Solutions**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# For Expo
expo install
```

## Development Tips

### Testing CAPTCHA Locally

Use Turnstile test keys to avoid rate limits:

```bash
# .env.local for development
EXPO_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

### Testing 2FA Without Phone

Use a desktop authenticator:
- **1Password** (Mac/Windows)
- **Authy** (Desktop app)
- **KeePassXC** (Cross-platform)

Or use the manual entry key instead of QR code.

### Bypassing 2FA in Development

To temporarily disable 2FA for testing:

```typescript
// In src/lib/mfa.ts, temporarily modify:
export async function isMFAEnabled(): Promise<boolean> {
  return false; // Force disable for testing
}
```

**Remember to revert before committing!**

## Next Steps

1. **Customize Copy**: Update user-facing text in screens
2. **Add Analytics**: Track 2FA adoption rates
3. **Email Notifications**: Alert users of security events
4. **Admin Panel**: Build tools to help users recover accounts
5. **Rate Limiting**: Implement Redis-based rate limiting (optional)

## Security Checklist

Before going live:

- [ ] Change Turnstile keys from test to production
- [ ] Enable HTTPS only (no HTTP)
- [ ] Set up monitoring for security events
- [ ] Document account recovery process
- [ ] Train support team on 2FA issues
- [ ] Add security page to website
- [ ] Set up security@gigledger.com email
- [ ] Test account recovery flows
- [ ] Review RLS policies on new tables
- [ ] Enable Supabase database backups

## Support

- **Documentation**: See `docs/security.md` for full details
- **Issues**: Open a GitHub issue
- **Security**: Email security@gigledger.com (private)

## Resources

- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Supabase MFA Docs](https://supabase.com/docs/guides/auth/auth-mfa)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
