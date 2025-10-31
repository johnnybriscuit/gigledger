# 🚀 GigLedger Pre-Beta Deployment Guide

## Goal
Get GigLedger deployed so testers can access it via:
- **Web**: Direct URL (e.g., gigledger.vercel.app)
- **Mobile**: Expo Go app or TestFlight

## 🎯 Quick Start (Web Only - 15 minutes)

### Step 1: Prepare for Deployment

```bash
cd /Users/johnburkhardt/dev/gigledger

# Ensure all changes are committed
git add .
git commit -m "chore: Prepare for pre-beta deployment"
git push
```

### Step 2: Configure for Production

Create `app.json` production config:

```json
{
  "expo": {
    "name": "GigLedger",
    "slug": "gigledger",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "googleMapsApiKey": "AIzaSyBNJRJ7kKDS1bGHaKmbpQf9D9nFc51wZqw"
    }
  }
}
```

### Step 3: Deploy to Vercel

#### Option A: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Export web build
npx expo export:web

# Deploy
cd web-build
vercel --prod
```

#### Option B: Vercel GitHub Integration

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import `johnnybriscuit/gigledger` from GitHub
4. Configure:
   - **Framework Preset**: Other
   - **Build Command**: `npx expo export:web`
   - **Output Directory**: `web-build`
   - **Install Command**: `npm install`

5. Add Environment Variables:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
   EXPO_PUBLIC_DEFAULT_MILEAGE_RATE=0.70
   ```

6. Click "Deploy"

**Result**: Get URL like `gigledger.vercel.app`

---

## 📱 Mobile Deployment (Expo Go - 10 minutes)

### Step 1: Publish to Expo

```bash
# Login to Expo
npx expo login

# Publish app
npx expo publish
```

### Step 2: Share with Testers

After publishing, you'll get:
- **QR Code** - Testers scan with Expo Go app
- **URL** - Direct link: `exp://exp.host/@your-username/gigledger`

**Testers need**:
1. Install Expo Go app ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Scan QR code or open link in Expo Go

---

## 🏗️ Full Production Deploy (1-2 hours)

### Step 1: Set Up EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure EAS
eas build:configure
```

This creates `eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "distribution": "store"
      },
      "android": {
        "distribution": "store"
      }
    }
  }
}
```

### Step 2: Build iOS (TestFlight)

```bash
# Build for iOS
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit --platform ios
```

**Requirements**:
- Apple Developer Account ($99/year)
- App Store Connect setup

### Step 3: Build Android (APK)

```bash
# Build APK for testing
eas build --platform android --profile preview

# Download APK and share link
```

**Result**: Direct download link for Android APK

---

## 🔧 Pre-Beta Configuration

### 1. Environment Variables

Create `.env.production`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
EXPO_PUBLIC_DEFAULT_MILEAGE_RATE=0.70
```

### 2. Supabase Setup

#### Enable Auth Redirects

In Supabase Dashboard → Authentication → URL Configuration:

```
# Add these to "Redirect URLs":
https://gigledger.vercel.app
https://gigledger.vercel.app/auth-callback
exp://exp.host/@your-username/gigledger
gigledger://auth-callback
```

#### Set Up RLS Policies

Ensure all tables have proper Row Level Security:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All should show rowsecurity = true
```

### 3. Database Migrations

Run all migrations in production Supabase:

```bash
# In Supabase SQL Editor, run in order:
supabase/migrations/00_create_profiles_and_tax_tables.sql
supabase/migrations/20250120_add_tax_withholding_tables.sql
# ... etc (all files in order)
```

### 4. Storage Setup

Create `receipts` bucket in Supabase:
- Go to Storage → New Bucket
- Name: `receipts`
- Public: No (private)
- File size limit: 5MB
- Allowed MIME types: `image/*`, `application/pdf`

---

## 🧪 Testing Checklist

Before sharing with testers:

### Web App
- [ ] Deployed to Vercel/Netlify
- [ ] Environment variables set
- [ ] Can sign up new account
- [ ] Can sign in
- [ ] Dashboard loads with charts
- [ ] Can create gig
- [ ] Can add expense
- [ ] Can add mileage
- [ ] Export works
- [ ] No console errors

### Mobile App (Expo Go)
- [ ] Published to Expo
- [ ] QR code works
- [ ] Can sign up/sign in
- [ ] All screens accessible
- [ ] Charts render (or show mobile fallback)
- [ ] Camera works (if enabled)
- [ ] No crashes

### Database
- [ ] All migrations applied
- [ ] RLS policies active
- [ ] Test user can CRUD their data
- [ ] Test user cannot see other users' data
- [ ] Storage bucket configured

---

## 👥 Tester Instructions

### For Web Testers

**Share this:**

> **GigLedger Pre-Beta**
> 
> 1. Visit: https://gigledger.vercel.app
> 2. Click "Sign Up" and create an account
> 3. Explore the dashboard and features
> 4. Report any bugs or feedback
> 
> **What to test:**
> - Create a few gigs
> - Add expenses and mileage
> - Try the auto-mileage calculator
> - Check the dashboard charts
> - Export your data
> 
> **Known limitations:**
> - This is pre-beta, expect some rough edges
> - Data may be reset during testing
> - Some features are still in development

### For Mobile Testers (Expo Go)

**Share this:**

> **GigLedger Pre-Beta (Mobile)**
> 
> 1. Install Expo Go: [iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
> 2. Scan this QR code: [Your QR Code]
> 3. Or open: exp://exp.host/@your-username/gigledger
> 4. Sign up and test!
> 
> **Note**: You need Expo Go installed to run the app

---

## 📊 Monitoring & Feedback

### Set Up Error Tracking

Add Sentry for error monitoring:

```bash
npm install @sentry/react-native

# Configure in App.tsx
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "pre-beta",
});
```

### Collect Feedback

Create a feedback form:
- Google Forms
- Typeform
- Or add in-app feedback button

### Analytics (Optional)

Add basic analytics:

```bash
npm install @react-native-firebase/analytics
# or
npm install expo-analytics
```

---

## 🚨 Pre-Beta Warnings

### Add to Your App

Create a banner component:

```typescript
// src/components/PreBetaBanner.tsx
export function PreBetaBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        ⚠️ Pre-Beta: Data may be reset. Report bugs to [your-email]
      </Text>
    </View>
  );
}
```

### Terms of Service (Simple)

Add a basic ToS:

```markdown
# GigLedger Pre-Beta Terms

By using this pre-beta version:
- You understand this is test software
- Data may be lost or reset
- Features may change or break
- No warranty or guarantees
- Use at your own risk

For support: [your-email]
```

---

## 🎯 Recommended Path for You

### Phase 1: Web Only (TODAY - 30 min)
1. ✅ Deploy to Vercel
2. ✅ Test yourself
3. ✅ Share with 2-3 close friends

### Phase 2: Mobile via Expo Go (NEXT WEEK - 1 hour)
1. Publish to Expo
2. Share QR code with testers
3. Collect feedback

### Phase 3: TestFlight/APK (LATER - 2 hours)
1. Set up EAS Build
2. Submit to TestFlight
3. Build Android APK
4. Expand tester group

---

## 📝 Quick Deploy Commands

### Web to Vercel
```bash
npx expo export:web
cd web-build
vercel --prod
```

### Mobile to Expo
```bash
npx expo publish
```

### Full Build
```bash
eas build --platform all --profile preview
```

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Clear caches
rm -rf node_modules
npm install
npx expo start --clear
```

### Environment Variables Not Working
- Check they're prefixed with `EXPO_PUBLIC_`
- Restart dev server after changes
- Verify in Vercel dashboard

### Auth Not Working
- Check Supabase redirect URLs
- Verify environment variables
- Check browser console for errors

### Charts Not Showing
- Check if recharts is installed
- Verify data is loading
- Check console for errors

---

## 📞 Support

**Before deploying:**
- Review this checklist
- Test locally first
- Backup database

**After deploying:**
- Monitor for errors
- Collect feedback
- Iterate quickly

---

**Ready to deploy?** Start with Phase 1 (Web to Vercel) - it's the fastest way to get a shareable link! 🚀

