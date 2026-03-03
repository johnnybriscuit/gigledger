# Native Release Guide - Bozzy iOS & Android

This guide covers building, testing, and releasing the Bozzy native apps for iOS (TestFlight) and Android (Play Internal Testing).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [App Identity](#app-identity)
3. [Environment Setup](#environment-setup)
4. [Building for Development](#building-for-development)
5. [Building for Preview (TestFlight/Play Internal Testing)](#building-for-preview)
6. [Building for Production](#building-for-production)
7. [Supabase Configuration](#supabase-configuration)
8. [Google OAuth Configuration](#google-oauth-configuration)
9. [Beta Tester Allowlist](#beta-tester-allowlist)
10. [Submitting to TestFlight](#submitting-to-testflight)
11. [Submitting to Play Internal Testing](#submitting-to-play-internal-testing)
12. [Pre-Store Release Checklist](#pre-store-release-checklist)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- **Apple Developer Account** ($99/year) - for iOS builds and TestFlight
- **Google Play Console Account** ($25 one-time) - for Android builds and Play Store
- **Expo Account** (free) - for EAS Build
- **Supabase Account** (already set up)

### Required Tools
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Verify you're logged in
eas whoami
```

### Project Setup
The project is already configured with:
- EAS Project ID: `f58c6a8c-e8e1-4034-9093-697148d6f016`
- Bundle Identifier: `com.bozzygigs.bozzy`
- Package Name: `com.bozzygigs.bozzy`
- Deep Link Scheme: `bozzy`

---

## App Identity

**DO NOT CHANGE THESE VALUES** - they are already configured correctly:

| Platform | Field | Value |
|----------|-------|-------|
| Display Name | `name` | `Bozzy` |
| iOS | `bundleIdentifier` | `com.bozzygigs.bozzy` |
| Android | `package` | `com.bozzygigs.bozzy` |
| Deep Link | `scheme` | `bozzy` |
| OAuth Callback | URI | `bozzy://auth/callback` |

---

## Environment Setup

### Environment Variables

The app uses the following environment variables (already configured in `eas.json`):

- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_SITE_URL` - Base URL for web redirects
- `EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED` - Enable/disable Google OAuth

**Note:** These are already set in `eas.json` for each build profile. No manual EAS secrets are required for basic functionality.

### Optional: Stripe Environment Variables

If you need to configure Stripe for native builds, add these as EAS secrets:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID_PROD --value price_xxxxx
eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID_PROD --value price_xxxxx
```

Then reference them in `eas.json`:
```json
"env": {
  "EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID_PROD": "$EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID_PROD",
  "EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID_PROD": "$EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID_PROD"
}
```

---

## Building for Development

Development builds include the Expo Dev Client for fast iteration.

### iOS Development Build

```bash
# Build for iOS simulator (local testing)
npm run build:ios:dev

# Or use EAS CLI directly
eas build --profile development --platform ios
```

**What this does:**
- Creates a development build with Expo Dev Client
- Includes debugging tools
- Can run on iOS Simulator
- Uses `http://localhost:8090` for SITE_URL

**Installing on Simulator:**
1. Build completes and provides a download link
2. Download the `.tar.gz` file
3. Extract and drag the `.app` to your simulator

### Android Development Build

```bash
# Build for Android emulator/device
npm run build:android:dev

# Or use EAS CLI directly
eas build --profile development --platform android
```

**What this does:**
- Creates an APK with Expo Dev Client
- Can be installed on Android emulator or physical device
- Includes debugging tools

**Installing on Device/Emulator:**
1. Build completes and provides a download link
2. Download the `.apk` file
3. Install via `adb install app.apk` or drag to emulator

---

## Building for Preview

Preview builds are for internal testing via TestFlight and Play Internal Testing.

### iOS Preview Build (TestFlight)

```bash
# Build for TestFlight distribution
npm run build:ios:preview

# Or use EAS CLI directly
eas build --profile preview --platform ios
```

**What this does:**
- Creates a production-like build
- Uses `https://bozzygigs.com` for SITE_URL
- Signed for internal distribution
- Ready for TestFlight upload

### Android Preview Build (Play Internal Testing)

```bash
# Build for Play Internal Testing
npm run build:android:preview

# Or use EAS CLI directly
eas build --profile preview --platform android
```

**What this does:**
- Creates an APK for internal testing
- Uses `https://bozzygigs.com` for SITE_URL
- Ready for Play Console upload

---

## Building for Production

Production builds are for App Store and Play Store release.

### iOS Production Build

```bash
# Build for App Store
npm run build:ios:prod

# Or use EAS CLI directly
eas build --profile production --platform ios
```

**What this does:**
- Creates an App Store-ready build
- Fully optimized and minified
- Requires Apple Developer account credentials

### Android Production Build

```bash
# Build for Play Store
npm run build:android:prod

# Or use EAS CLI directly
eas build --profile production --platform android
```

**What this does:**
- Creates an App Bundle (`.aab`) for Play Store
- Fully optimized and minified
- Requires Play Console credentials

---

## Supabase Configuration

### Required Redirect URLs

Add these URLs in **Supabase Dashboard** → **Authentication** → **URL Configuration**:

#### Redirect URLs (for OAuth callbacks)
```
bozzy://auth/callback
exp://localhost:8081/--/auth/callback
https://bozzygigs.com/auth/callback
```

#### Site URL
```
https://bozzygigs.com
```

#### Additional Redirect URLs (optional, for development)
```
http://localhost:8090/auth/callback
```

### Steps to Configure

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `jvostkeswuhfwntbrfzl`
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, click **Add URL** and add each URL above
5. Set **Site URL** to `https://bozzygigs.com`
6. Click **Save**

---

## Google OAuth Configuration

### Supabase Google OAuth Setup

1. In **Supabase Dashboard** → **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project or create a new one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Select **iOS** application type:
   - Bundle ID: `com.bozzygigs.bozzy`
6. Select **Android** application type:
   - Package name: `com.bozzygigs.bozzy`
   - SHA-1 certificate fingerprint: (get from EAS build logs)
7. Add **Authorized redirect URIs**:
   ```
   https://jvostkeswuhfwntbrfzl.supabase.co/auth/v1/callback
   ```

### Getting Android SHA-1 Fingerprint

```bash
# After building an Android app with EAS
eas credentials -p android

# Or from build logs - look for:
# "SHA1 Fingerprint: XX:XX:XX:..."
```

---

## Beta Tester Allowlist

Friends and family can bypass subscription paywalls using the beta tester allowlist.

### How It Works

- Beta testers are stored in the `beta_testers` table
- Users with `active = true` bypass all subscription limits
- They get unlimited gigs, expenses, invoices, and exports
- No payment required

### Adding a Beta Tester

**Option 1: SQL (Recommended)**

Run this in **Supabase Dashboard** → **SQL Editor**:

```sql
insert into beta_testers (email, notes)
values ('friend@example.com', 'Friend from college');
```

**Option 2: Supabase Table Editor**

1. Go to **Supabase Dashboard** → **Table Editor**
2. Select `beta_testers` table
3. Click **Insert** → **Insert row**
4. Fill in:
   - `email`: The user's email address (must match their auth email)
   - `active`: `true` (checked)
   - `notes`: Optional note (e.g., "Friend from college")
5. Click **Save**

### Removing a Beta Tester

```sql
-- Deactivate (keeps record)
update beta_testers
set active = false
where email = 'friend@example.com';

-- Or delete completely
delete from beta_testers
where email = 'friend@example.com';
```

### Checking Beta Tester Status

```sql
select * from beta_testers
where active = true
order by created_at desc;
```

---

## Submitting to TestFlight

### Prerequisites

- Apple Developer account with Admin or App Manager role
- App created in App Store Connect
- iOS build completed via EAS

### Steps

1. **Create App in App Store Connect** (first time only)
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Click **My Apps** → **+** → **New App**
   - Fill in:
     - Platform: iOS
     - Name: Bozzy
     - Primary Language: English (U.S.)
     - Bundle ID: `com.bozzygigs.bozzy`
     - SKU: `bozzy-ios` (or any unique identifier)
   - Click **Create**

2. **Upload Build via EAS**
   ```bash
   # After build completes, submit to App Store Connect
   eas submit --platform ios --latest
   ```

3. **Configure TestFlight**
   - In App Store Connect, go to your app
   - Click **TestFlight** tab
   - Wait for build to process (10-30 minutes)
   - Once processed, click on the build
   - Fill in **What to Test** notes
   - Click **Save**

4. **Add Internal Testers**
   - In TestFlight tab, click **Internal Testing**
   - Click **+** next to testers
   - Add tester emails (must have Apple ID)
   - Click **Add**
   - Testers will receive an email with TestFlight link

5. **Add External Testers** (optional, requires App Review)
   - Click **External Testing** → **+**
   - Create a test group
   - Add testers (up to 10,000)
   - Submit for Beta App Review (1-2 days)

### TestFlight Tester Instructions

Send this to your testers:

```
1. Install TestFlight from the App Store
2. Open the invitation email on your iPhone
3. Tap "View in TestFlight"
4. Tap "Install" or "Update"
5. Open Bozzy and start testing!
```

---

## Submitting to Play Internal Testing

### Prerequisites

- Google Play Console account
- App created in Play Console
- Android build completed via EAS

### Steps

1. **Create App in Play Console** (first time only)
   - Go to [Google Play Console](https://play.google.com/console)
   - Click **Create app**
   - Fill in:
     - App name: Bozzy
     - Default language: English (United States)
     - App or game: App
     - Free or paid: Free
   - Accept declarations
   - Click **Create app**

2. **Upload Build via EAS**
   ```bash
   # After build completes, submit to Play Console
   eas submit --platform android --latest
   ```

   **Note:** First time requires manual upload:
   - Download the `.aab` file from EAS build
   - In Play Console, go to **Testing** → **Internal testing**
   - Click **Create new release**
   - Upload the `.aab` file
   - Fill in release notes
   - Click **Review release** → **Start rollout to Internal testing**

3. **Add Internal Testers**
   - In Play Console, go to **Testing** → **Internal testing**
   - Click **Testers** tab
   - Click **Create email list**
   - Name it (e.g., "Friends & Family")
   - Add tester emails
   - Click **Save changes**
   - Copy the **opt-in URL** to share with testers

4. **Share with Testers**
   - Send the opt-in URL to testers
   - They must open it on their Android device
   - They'll be prompted to join the test
   - After joining, they can download from Play Store

### Play Internal Testing Tester Instructions

Send this to your testers:

```
1. Open this link on your Android device: [OPT-IN URL]
2. Tap "Become a tester"
3. Open the Google Play Store
4. Search for "Bozzy" or tap the Play Store link
5. Tap "Install" or "Update"
6. Open Bozzy and start testing!
```

---

## Pre-Store Release Checklist

Before submitting to the App Store or Play Store for public release:

### App Assets

- [ ] **App Icon** (1024x1024 PNG, no transparency, no rounded corners)
  - Located at: `./assets/icon.png`
  - Must be updated before production release
  
- [ ] **Splash Screen** (2048x2048 PNG)
  - Located at: `./assets/splash-icon.png`
  - Must be updated before production release

- [ ] **Screenshots** (required for both stores)
  - iOS: 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 14 Plus), 5.5" (iPhone 8 Plus)
  - Android: Phone, 7" tablet, 10" tablet
  - Capture key screens: Dashboard, Gigs, Expenses, Invoices

### App Store Connect (iOS)

- [ ] App name and subtitle
- [ ] App description (4000 characters max)
- [ ] Keywords (100 characters max)
- [ ] Support URL: `https://bozzygigs.com/support`
- [ ] Privacy Policy URL: `https://bozzygigs.com/privacy`
- [ ] Age rating (complete questionnaire)
- [ ] App category: Finance or Productivity
- [ ] Pricing: Free with in-app purchases

### Google Play Console (Android)

- [ ] Short description (80 characters max)
- [ ] Full description (4000 characters max)
- [ ] App category: Finance or Productivity
- [ ] Content rating (complete questionnaire)
- [ ] Target audience: Adults
- [ ] Privacy Policy URL: `https://bozzygigs.com/privacy`
- [ ] Data safety form (what data you collect)
- [ ] Pricing: Free with in-app purchases

### Legal & Compliance

- [ ] Privacy Policy published at `https://bozzygigs.com/privacy`
- [ ] Terms of Service published at `https://bozzygigs.com/terms`
- [ ] GDPR compliance (if applicable)
- [ ] CCPA compliance (if applicable)
- [ ] Data deletion instructions

### Technical

- [ ] All features tested on physical devices (iOS and Android)
- [ ] Google OAuth working on native apps
- [ ] Deep linking working (`bozzy://` URLs)
- [ ] Subscription/payment flow tested
- [ ] Beta tester allowlist tested
- [ ] Crash reporting configured (if using Sentry/Bugsnag)
- [ ] Analytics configured (if using Google Analytics/Mixpanel)

### Marketing

- [ ] App Store preview video (optional but recommended)
- [ ] Promotional text (170 characters, iOS only)
- [ ] Feature graphic (1024x500, Android only)
- [ ] Social media assets prepared
- [ ] Launch announcement drafted

---

## Troubleshooting

### Build Failures

**"Bundle identifier is already in use"**
- The bundle ID `com.bozzygigs.bozzy` is already registered
- Ensure you're logged into the correct Apple Developer account
- Check that the bundle ID matches in `app.config.js`

**"Android build failed: Gradle error"**
- Clear EAS build cache: `eas build --clear-cache`
- Check that `package` in `app.config.js` is `com.bozzygigs.bozzy`

### OAuth Issues

**"redirect_uri_mismatch" error**
- Verify all redirect URLs are added in Supabase Dashboard
- Check Google Cloud Console has correct redirect URI
- Ensure deep link scheme is `bozzy` in `app.config.js`

**Google OAuth not working on native**
- Check that `AuthSession.makeRedirectUri` is being used (not `Linking.createURL`)
- Verify `scheme: 'bozzy'` is set in `app.config.js`
- Check Supabase redirect URLs include `bozzy://auth/callback`

### Beta Tester Issues

**Beta tester still seeing paywall**
- Verify email in `beta_testers` table matches user's auth email exactly
- Check `active = true` in database
- User may need to log out and log back in
- Check browser console for `Is beta tester?: true` in logs

**Can't add beta tester**
- Ensure migration `20260220_create_beta_testers.sql` has been run
- Check RLS policies allow service role to insert
- Verify email format is valid

### TestFlight Issues

**Build stuck in "Processing"**
- This is normal, can take 10-30 minutes
- If stuck for >1 hour, check for email from Apple about issues
- Common issues: missing export compliance, invalid entitlements

**Testers not receiving invite**
- Check email address is correct in App Store Connect
- Check spam folder
- Ensure tester has an Apple ID
- Try removing and re-adding tester

### Play Console Issues

**"App not available in your country"**
- Check that your country is enabled in Play Console
- Go to **Production** → **Countries/regions** and add your country

**Upload failed: "Version code already exists"**
- Increment `versionCode` in `app.config.js`
- Rebuild and resubmit

---

## Additional Resources

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Apple TestFlight Documentation](https://developer.apple.com/testflight/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)

---

## Support

For questions or issues:
- Check this guide first
- Review build logs in EAS dashboard
- Check Supabase logs for auth issues
- Contact the development team

**Last Updated:** February 20, 2026
