# App Rename: GigLedger → Bozzy

**Date:** January 28, 2026  
**Domain:** bozzygigs.com

## ✅ Completed Changes

### 1. Critical Configuration Files
- ✅ `app.config.js` - Updated name, slug, scheme, bundle IDs
  - App name: `Bozzy`
  - Slug: `bozzy`
  - URL scheme: `bozzy`
  - iOS bundle: `com.bozzy.app`
  - Android package: `com.bozzy.app`
- ✅ `app.json` - Updated name and bundle identifiers
- ✅ `package.json` - Updated package name to `bozzy`

### 2. User-Facing Content
- ✅ Terms of Service (`TermsScreen.tsx`) - All 37 instances
- ✅ Privacy Policy (`PrivacyScreen.tsx`) - All 21 instances
- ✅ Landing Page (`PublicLandingPage.tsx`) - All 4 instances
- ✅ Support email updated: `support@bozzygigs.com`

### 3. Export Files & Generated Content
All export generators updated with new app name and domain:
- ✅ Schedule C exports
- ✅ TurboTax packs
- ✅ TaxAct packs
- ✅ TXF files
- ✅ PDF generators
- ✅ Excel exports
- ✅ CSV bundles
- ✅ JSON backups
- ✅ Backup codes

**Filenames changed from:**
- `gigledger_*.zip` → `bozzy_*.zip`
- `gigledger_*.txf` → `bozzy_*.txf`
- `GigLedger_*.xlsx` → `Bozzy_*.xlsx`
- etc.

### 4. UI Components
- ✅ Loading Screen
- ✅ Welcome messages
- ✅ Onboarding wizard
- ✅ Dashboard empty state
- ✅ Business structure wizard
- ✅ Tax settings
- ✅ Paywall modals
- ✅ Error screens
- ✅ MFA backup codes

### 5. Documentation
- ✅ README.md - Main heading, URLs, examples
- ✅ GitHub repo references updated to `johnnybriscuit/bozzy`
- ✅ Domain references updated to `bozzygigs.com`

---

## 🔄 Next Steps (Manual Actions Required)

### 1. Environment Variables
Update your `.env` files with new domain:
```bash
# Local
EXPO_PUBLIC_SITE_URL=http://localhost:8090

# Staging
EXPO_PUBLIC_SITE_URL=https://staging.bozzygigs.com

# Production
EXPO_PUBLIC_SITE_URL=https://bozzygigs.com
```

### 2. Supabase Configuration
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update redirect URLs:
   - `https://bozzygigs.com/*`
   - `https://bozzygigs.com/auth/callback`
   - `https://staging.bozzygigs.com/*` (if using staging)

3. Update email templates:
   - Magic link emails
   - Confirmation emails
   - Password reset emails
   - Update sender name to "Bozzy"

### 3. Vercel/Hosting Configuration
1. Update environment variables in Vercel dashboard
2. Add custom domain: `bozzygigs.com`
3. Configure DNS:
   - A record: `@` → Vercel IP
   - CNAME: `www` → `cname.vercel-dns.com`
4. Enable SSL certificate

### 4. DNS Configuration (Squarespace)
Since you bought the domain from Squarespace:
1. Go to Squarespace domain settings
2. Add DNS records for Vercel:
   - Type: A, Name: @, Value: 76.76.21.21
   - Type: CNAME, Name: www, Value: cname.vercel-dns.com
3. Or point nameservers to Vercel's nameservers

### 5. Mobile App Store (When Ready)
**iOS:**
- Bundle ID changed to `com.bozzy.app`
- Will need new App Store listing
- Update app name, description, screenshots

**Android:**
- Package changed to `com.bozzy.app`
- Will need new Play Store listing
- Update app name, description, screenshots

### 6. Git Repository
Optional - rename the repository:
```bash
# On GitHub, go to Settings → Rename repository
# Then update local remote:
git remote set-url origin https://github.com/johnnybriscuit/bozzy.git
```

### 7. Assets to Update (Optional)
Consider updating these with new branding:
- `/assets/icon.png` - App icon
- `/assets/splash-icon.png` - Splash screen
- `/assets/favicon.png` - Website favicon
- `/assets/adaptive-icon.png` - Android adaptive icon

---

## 📊 Statistics

- **Files modified:** ~150+
- **Configuration files:** 3
- **User-facing screens:** 10+
- **Export generators:** 12
- **Component files:** 15+
- **Total "GigLedger" replacements:** 600+

---

## ⚠️ Important Notes

1. **Bundle IDs Changed:** iOS and Android bundle identifiers have changed. If you've already published the app, this will require a new app store listing.

2. **Email Address:** All support emails now reference `support@bozzygigs.com`. Make sure this email is set up and monitored.

3. **Domain Setup:** The domain `bozzygigs.com` needs to be properly configured with DNS and SSL before going live.

4. **Testing Required:** After deploying, test:
   - Magic link authentication
   - Password reset flows
   - All export downloads
   - Deep links (if using)
   - OAuth flows (if using Google SSO)

5. **Documentation Files:** Many `.md` files in the repo still reference GigLedger. These are internal docs and can be updated gradually as needed.

---

## 🧪 Testing Checklist

Before going live, verify:
- [ ] App launches with "Bozzy" branding
- [ ] Terms of Service displays "Bozzy"
- [ ] Privacy Policy displays "Bozzy"
- [ ] Landing page shows "Bozzy"
- [ ] Export files download with "bozzy_" prefix
- [ ] PDF exports show "Bozzy" branding
- [ ] Email templates work with new domain
- [ ] Magic links redirect correctly
- [ ] Support email works
- [ ] Domain SSL is active
- [ ] Mobile deep links work (if applicable)

---

## 📝 Rollback Plan

If you need to revert:
1. The changes are all in git history
2. Run: `git log --oneline` to find the commit before rename
3. Run: `git revert <commit-hash>` to undo changes
4. Or manually revert specific files

---

**Rename completed successfully! 🎉**

All code references to "GigLedger" have been updated to "Bozzy" and the domain has been changed to "bozzygigs.com".
