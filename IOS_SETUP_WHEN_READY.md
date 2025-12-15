# iOS Setup Guide - When Ready for Apple Developer Program

## 📱 Current Status

- ✅ iOS configuration complete in `app.config.js`
- ✅ Bundle ID: `com.gigledger.app`
- ✅ Platform-aware auth redirects implemented
- ✅ Deep link handling configured
- ✅ Supabase redirect URLs added
- ⏳ **Waiting for Apple Developer Program enrollment**

---

## 💰 Cost

**Apple Developer Program:** $99/year
- Required for TestFlight distribution
- Required for App Store submission
- Includes certificates, provisioning profiles, and app signing

---

## 🚀 Steps to Complete When Ready

### Step 1: Enroll in Apple Developer Program

1. Go to: https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID: `jkburkhardt1@gmail.com`
3. Complete enrollment form
4. Pay $99 annual fee
5. Wait for approval (usually 24-48 hours, sometimes instant)

**You'll receive an email when approved.**

---

### Step 2: Generate App-Specific Password

Once enrolled, you'll need an app-specific password for EAS to access your Apple account:

1. Go to: https://appleid.apple.com
2. Sign in with your Apple ID
3. Go to **Security** → **App-Specific Passwords**
4. Click **Generate Password**
5. Name it: `EAS Build`
6. Copy the generated password (you'll need this for the build)

---

### Step 3: Run iOS Build

Once enrolled and you have your app-specific password:

```bash
cd /Users/johnburkhardt/dev/gigledger
eas build --platform ios --profile preview
```

**What will happen:**

1. EAS will ask for your Apple ID: `jkburkhardt1@gmail.com`
2. EAS will ask for your password: Use the **app-specific password** (not your regular password)
3. EAS will ask for 2FA code (if enabled)
4. EAS will generate certificates and provisioning profiles automatically
5. Build will start (~15-20 minutes)
6. You'll get a download link for the `.ipa` file

---

### Step 4: Submit to TestFlight

After the build completes:

```bash
eas submit --platform ios --latest
```

Or manually:
1. Download the `.ipa` file from the build page
2. Go to: https://appstoreconnect.apple.com
3. Create a new app (if not already created)
4. Upload the `.ipa` via Transporter app or web interface
5. Add yourself as a tester
6. Install TestFlight app on your iPhone
7. Accept the invite and install GigLedger

---

### Step 5: Test Google Sign-In on iOS

1. Open GigLedger from TestFlight
2. Tap "Continue with Google"
3. Safari opens with Google sign-in
4. Sign in with your Google account
5. Google redirects to Supabase
6. Supabase redirects to `gigledger://auth/callback`
7. iOS opens GigLedger app
8. You should be authenticated and land on the dashboard

**Debug if needed:**
1. Connect iPhone to Mac
2. Open Xcode → Window → Devices and Simulators
3. Select your iPhone → Open Console
4. Filter by "GigLedger"
5. Look for `[DeepLink]` and `[Auth]` logs

---

## 🔍 Expected Logs on iOS

```
[DeepLink] Received URL: gigledger://auth/callback?code=...
[DeepLink] Parsed - hostname: null, path: auth/callback
[DeepLink] Auth callback detected, navigating to auth-callback screen
[Auth] Platform: ios
[Auth] Redirect URL: gigledger://auth/callback
[AuthCallback] Processing auth callback
[AuthCallback] Session established for: user@example.com
```

---

## 📝 Quick Reference Commands

```bash
# Build iOS for TestFlight
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit --platform ios --latest

# Check build status
eas build:list --platform ios

# View specific build
eas build:view <build-id>
```

---

## ✅ Pre-Flight Checklist (Before Building)

- [ ] Enrolled in Apple Developer Program ($99/year)
- [ ] Enrollment approved (check email)
- [ ] Generated app-specific password
- [ ] Have 2FA codes ready (if enabled)
- [ ] Verified Supabase redirect URLs include `gigledger://auth/callback`
- [ ] Tested web Google sign-in on Vercel first

---

## 🆘 Common Issues

### Issue: "Invalid credentials"

**Solution:** Use app-specific password, not your regular Apple ID password.

### Issue: "No Apple Developer account found"

**Solution:** Wait for enrollment approval (24-48 hours). Check email for confirmation.

### Issue: "Bundle ID already registered"

**Solution:** 
- If you own it: EAS will use existing bundle ID
- If someone else owns it: Change bundle ID in `app.config.js`

### Issue: "Deep link not working on iOS"

**Solution:**
1. Verify `scheme: 'gigledger'` in `app.config.js`
2. Check Supabase has `gigledger://auth/callback` in redirect URLs
3. Rebuild app after any config changes

---

## 📊 Build Timeline

- **Enrollment:** 24-48 hours (sometimes instant)
- **First build:** ~20 minutes
- **Subsequent builds:** ~15 minutes
- **TestFlight processing:** ~5-10 minutes
- **Total time to test:** ~30-40 minutes after enrollment

---

## 💡 Tips

1. **Test on web first** - Make sure Google sign-in works on https://gigledger-ten.vercel.app before building iOS
2. **Use TestFlight** - Don't submit to App Store until you've tested thoroughly on TestFlight
3. **Keep app-specific password safe** - Store it in a password manager
4. **Monitor builds** - Watch the build logs at https://expo.dev for any issues

---

## 🎯 What's Already Done

- ✅ `app.config.js` configured with iOS settings
- ✅ Bundle ID: `com.gigledger.app`
- ✅ URL scheme: `gigledger://`
- ✅ Encryption declaration added (`ITSAppUsesNonExemptEncryption: false`)
- ✅ Platform-aware auth redirects in `AuthScreen.tsx`
- ✅ Deep link handling in `App.tsx`
- ✅ Supabase redirect URLs configured
- ✅ EAS secrets configured

**You're 100% ready to build as soon as you enroll in the Apple Developer Program!**

---

**When you're ready to proceed, just run:**
```bash
eas build --platform ios --profile preview
```

Good luck! 🚀
