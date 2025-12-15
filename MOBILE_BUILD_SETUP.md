# GigLedger Mobile Build Setup Guide

## 📱 Overview

This guide covers building GigLedger as native iOS and Android apps using Expo + EAS Build.

**Current Status:**
- ✅ Web app deployed on Vercel: https://gigledger-ten.vercel.app
- ✅ Custom URL scheme: `gigledger://`
- ✅ Bundle IDs: `com.gigledger.app`
- ⚠️ No custom domain yet (no universal links/app links)

---

## 🚀 Quick Start Checklist

### Prerequisites
- [ ] Apple Developer Account ($99/year) - for iOS builds
- [ ] Google Play Developer Account ($25 one-time) - for Android builds
- [ ] Expo account (free) - create at https://expo.dev

### Initial Setup (One-Time)

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Initialize EAS project (from repo root)
cd /Users/johnburkhardt/dev/gigledger
eas init

# This will:
# - Create an EAS project
# - Generate a project ID
# - Ask you to confirm the project slug
```

**After `eas init` completes:**

The command will output your EAS Project ID. Add it to your `.env` file:

```bash
# Add to .env (not .env.example)
EXPO_PUBLIC_EAS_PROJECT_ID=your-actual-project-id-here
```

---

## 🔐 Configure EAS Secrets

**IMPORTANT:** Do NOT hardcode Supabase credentials in `eas.json`. Use EAS Secrets instead.

```bash
# Set Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"

# Set Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key-here"

# Set Site URL (production)
eas secret:create --scope project --name EXPO_PUBLIC_SITE_URL --value "https://gigledger-ten.vercel.app"

# Enable Google OAuth
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED --value "true"

# Set EAS Project ID
eas secret:create --scope project --name EXPO_PUBLIC_EAS_PROJECT_ID --value "your-project-id"
```

**Verify secrets:**
```bash
eas secret:list
```

---

## 🔧 Supabase Configuration

### Add Redirect URLs in Supabase Dashboard

Go to: **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**

Add these **exact** URLs:

```
# Web (Vercel production)
https://gigledger-ten.vercel.app/auth/callback

# iOS deep link
gigledger://auth/callback

# Android deep link
gigledger://auth/callback

# Local development (optional)
http://localhost:8090/auth/callback
```

**Important Notes:**
- ✅ Use custom scheme `gigledger://` for native apps
- ❌ Do NOT add universal link URLs yet (no domain)
- ❌ Do NOT add `.well-known` files yet

### Google OAuth Configuration

In **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs:**

**Authorized redirect URIs:**
```
# Supabase callback (existing)
https://your-project.supabase.co/auth/v1/callback

# Web app callback
https://gigledger-ten.vercel.app/auth/callback
```

**Note:** Native apps use custom scheme (`gigledger://`) which doesn't need to be added to Google OAuth redirect URIs. The OAuth flow redirects to Supabase, which then redirects to your app.

---

## 📦 Build Commands

### iOS TestFlight Build

```bash
# Build for TestFlight (internal testing)
eas build --platform ios --profile preview

# What happens:
# - EAS builds your app in the cloud (~15-20 minutes)
# - First build will ask for Apple credentials
# - Generates an .ipa file
# - You can download or auto-submit to TestFlight
```

**First-time iOS setup:**
- EAS will prompt for your Apple ID
- Generate app-specific password at: https://appleid.apple.com
- EAS will handle certificates and provisioning profiles

**Submit to TestFlight:**
```bash
# Automatic submission (recommended)
eas submit --platform ios --latest

# Or download .ipa and upload via App Store Connect
```

### Android Internal Testing Build

```bash
# Build for Google Play Internal Testing
eas build --platform android --profile preview

# What happens:
# - EAS builds your app in the cloud (~10-15 minutes)
# - First build will generate a keystore (EAS manages it)
# - Generates an .apk file
# - You can download or auto-submit to Google Play
```

**Submit to Google Play:**
```bash
# Manual upload (recommended for first time)
# 1. Download .apk from EAS build page
# 2. Go to Google Play Console
# 3. Create app → Internal testing → Upload .apk
```

### Build Both Platforms

```bash
# Build iOS and Android simultaneously
eas build --platform all --profile preview
```

### Check Build Status

```bash
# List all builds
eas build:list

# View specific build details
eas build:view <build-id>
```

---

## 🧪 Testing Google Sign-In

### On Web (Vercel)

1. Go to https://gigledger-ten.vercel.app
2. Click "Continue with Google"
3. Sign in with Google account
4. Should redirect to `/auth/callback`
5. Should land on dashboard authenticated

**Debug:**
- Open browser console (F12)
- Look for `[Auth]` and `[DeepLink]` logs
- Check redirect URL: should be `https://gigledger-ten.vercel.app/auth/callback`

### On iOS (TestFlight)

**Prerequisites:**
- TestFlight app installed on iPhone
- Added as tester in App Store Connect

**Test Flow:**
1. Open GigLedger from TestFlight
2. Tap "Continue with Google"
3. Safari opens with Google sign-in
4. Sign in with Google account
5. Google redirects to Supabase
6. Supabase redirects to `gigledger://auth/callback`
7. iOS opens GigLedger app
8. App processes callback and authenticates
9. Should land on dashboard

**Debug:**
1. Connect iPhone to Mac
2. Open Xcode → Window → Devices and Simulators
3. Select your iPhone → Open Console
4. Filter by "GigLedger"
5. Look for `[DeepLink]` and `[Auth]` logs

**Expected logs:**
```
[DeepLink] Received URL: gigledger://auth/callback?code=...
[DeepLink] Parsed - hostname: null, path: auth/callback
[DeepLink] Auth callback detected, navigating to auth-callback screen
[AuthCallback] Session established for: user@example.com
```

### On Android (Internal Testing)

**Prerequisites:**
- Added as tester in Google Play Console
- Testing link shared with your Gmail account

**Test Flow:**
1. Open testing link on Android device
2. Install GigLedger
3. Open app
4. Tap "Continue with Google"
5. Chrome opens with Google sign-in
6. Sign in with Google account
7. Google redirects to Supabase
8. Supabase redirects to `gigledger://auth/callback`
9. Android opens GigLedger app
10. App processes callback and authenticates
11. Should land on dashboard

**Debug:**
1. Connect Android device via USB
2. Enable USB debugging in Developer Options
3. Run: `adb logcat | grep GigLedger`
4. Look for `[DeepLink]` and `[Auth]` logs

---

## 🐛 Common Issues & Solutions

### Issue: "Bundle identifier is already in use"

**Solution:** Bundle ID `com.gigledger.app` is already configured. If you need to change it:

1. Update `app.config.js`:
   ```javascript
   bundleIdentifier: 'com.yourcompany.gigledger'
   package: 'com.yourcompany.gigledger'
   ```
2. Update URL scheme if desired:
   ```javascript
   scheme: 'yourapp'
   ```
3. Update Supabase redirect URLs accordingly

### Issue: "Deep link not opening app"

**Symptoms:** After Google sign-in, browser shows "Page not found" or doesn't redirect to app.

**Solution:**
1. Verify URL scheme in `app.config.js`: `scheme: 'gigledger'`
2. Check Supabase redirect URLs include: `gigledger://auth/callback`
3. Rebuild app after config changes
4. Test deep link manually:
   - iOS: `xcrun simctl openurl booted "gigledger://auth/callback"`
   - Android: `adb shell am start -W -a android.intent.action.VIEW -d "gigledger://auth/callback" com.gigledger.app`

### Issue: "Session not established after callback"

**Symptoms:** App opens but user not authenticated.

**Solution:**
1. Check console logs for errors
2. Verify Supabase session is created:
   ```javascript
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Session:', session);
   ```
3. Ensure `AuthCallbackScreen` is handling the callback correctly
4. Check that deep link includes auth code: `gigledger://auth/callback?code=...`

### Issue: "Google OAuth fails with 'redirect_uri_mismatch'"

**Solution:**
1. Verify Supabase redirect URL is added in Google Cloud Console
2. Check format: `https://your-project.supabase.co/auth/v1/callback`
3. Ensure Google OAuth is enabled in Supabase Dashboard

### Issue: "Build fails with 'expo-secure-store' error"

**Solution:** Already configured in `app.config.js`:
```javascript
plugins: ['expo-secure-store']
```

If still failing, try:
```bash
npm install expo-secure-store@latest
eas build --platform ios --profile preview --clear-cache
```

### Issue: "EAS Secrets not being used"

**Symptoms:** Build fails with "EXPO_PUBLIC_SUPABASE_URL is not defined"

**Solution:**
1. Verify secrets are set: `eas secret:list`
2. Secrets are automatically injected during build
3. Do NOT add env vars to `eas.json` (use secrets instead)
4. Rebuild: `eas build --platform ios --profile preview`

---

## 📋 Build Profiles Explained

### `development`
- For local testing with Expo Go or development builds
- iOS: Simulator builds
- Android: APK builds
- Not for distribution

### `preview` (Recommended for testing)
- For internal testing (TestFlight, Google Play Internal Testing)
- iOS: Real device builds, Release configuration
- Android: APK builds (faster than AAB)
- Can be distributed to testers

### `production`
- For App Store and Google Play Store releases
- iOS: Real device builds, Release configuration
- Android: AAB builds (required for Play Store)
- Requires full app store submission

---

## 🔄 Update Workflow

When you make code changes and want to test on devices:

```bash
# 1. Commit your changes
git add .
git commit -m "Your changes"
git push

# 2. Rebuild for testing
eas build --platform all --profile preview

# 3. Wait for builds to complete (~15-20 min)

# 4. Download and install on test devices
# Or auto-submit to TestFlight/Google Play
```

**Version bumping:**
```bash
# Automatically bump version
eas build:version:set --platform ios
eas build:version:set --platform android

# Or manually edit app.config.js:
# version: '1.0.1'
# ios.buildNumber: '2'
# android.versionCode: 2
```

---

## 📊 Platform-Specific Notes

### iOS
- **Minimum iOS version:** 13.0 (default)
- **Supported devices:** iPhone, iPad
- **TestFlight:** Up to 10,000 external testers
- **Review time:** 1-2 hours for TestFlight, 1-2 days for App Store

### Android
- **Minimum Android version:** 5.0 (API 21)
- **Supported devices:** All Android devices
- **Internal Testing:** Up to 100 testers
- **Review time:** Instant for internal testing, 1-2 days for production

---

## 🎯 Next Steps

1. ✅ Run `eas init` to create EAS project
2. ✅ Set up EAS Secrets for Supabase credentials
3. ✅ Add redirect URLs in Supabase Dashboard
4. ✅ Build preview versions for iOS and Android
5. ✅ Test Google sign-in on all platforms
6. ⏳ Add testers to TestFlight and Google Play
7. ⏳ Collect feedback and iterate
8. ⏳ Build production versions for app stores

---

## 📚 Resources

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **EAS Submit Docs:** https://docs.expo.dev/submit/introduction/
- **Deep Linking Guide:** https://docs.expo.dev/guides/deep-linking/
- **Supabase Auth with Expo:** https://supabase.com/docs/guides/auth/social-login/auth-google
- **Expo Linking API:** https://docs.expo.dev/versions/latest/sdk/linking/

---

## ✅ Pre-Flight Checklist

Before building for the first time:

- [ ] `eas init` completed
- [ ] EAS Project ID added to `.env`
- [ ] EAS Secrets configured (Supabase URL, Anon Key, Site URL)
- [ ] Supabase redirect URLs added (web + native)
- [ ] Google OAuth redirect URIs configured
- [ ] Apple Developer account enrolled (for iOS)
- [ ] Google Play Developer account created (for Android)
- [ ] Tested web Google sign-in on Vercel
- [ ] Ready to build and test on devices

---

**Last Updated:** December 2025
**GigLedger Version:** 1.0.0
**Expo SDK:** 54
