# EAS Init - Manual Steps Required

## ✅ What's Already Done

- ✅ EAS CLI installed globally (`eas-cli`)
- ✅ `eas.json` created with build profiles
- ✅ `app.config.js` configured with bundle IDs
- ✅ Platform-aware auth redirect logic implemented
- ✅ Deep link handling added to App.tsx

## 🔧 What You Need to Do Now

### Step 1: Run EAS Init

Open your terminal and run:

```bash
cd /Users/johnburkhardt/dev/gigledger
eas init
```

**Expected prompts:**

1. **"Would you like to create a project for @your-username/gigledger?"**
   - Answer: `Yes` or press Enter

2. **Output will show:**
   ```
   ✔ Created EAS project
   Project ID: abc123-def456-ghi789
   ```

3. **Copy the Project ID** (the long string after "Project ID:")

---

### Step 2: Add Project ID to .env

Create or edit `.env` file in the repo root:

```bash
# Add this line with your actual project ID
EXPO_PUBLIC_EAS_PROJECT_ID=abc123-def456-ghi789
```

**Full .env file should look like:**

```bash
# Tax Calculation Configuration
EXPO_PUBLIC_TAX_YEAR=2025
EXPO_PUBLIC_FEDERAL_FLAT_RATE_SINGLE=0.12
EXPO_PUBLIC_FEDERAL_FLAT_RATE_MARRIED=0.12
EXPO_PUBLIC_FEDERAL_FLAT_RATE_HOH=0.12
EXPO_PUBLIC_USE_FEDERAL_BRACKETS=false

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Site URL (production Vercel URL)
EXPO_PUBLIC_SITE_URL=https://gigledger-ten.vercel.app

# Google OAuth
EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED=true

# EAS Project ID (from eas init)
EXPO_PUBLIC_EAS_PROJECT_ID=abc123-def456-ghi789
```

---

### Step 3: Configure EAS Secrets

Run these commands to set up secrets (replace with your actual values):

```bash
# Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"

# Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key-here"

# Site URL
eas secret:create --scope project --name EXPO_PUBLIC_SITE_URL --value "https://gigledger-ten.vercel.app"

# Google OAuth
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED --value "true"

# EAS Project ID
eas secret:create --scope project --name EXPO_PUBLIC_EAS_PROJECT_ID --value "abc123-def456-ghi789"
```

**Verify secrets:**
```bash
eas secret:list
```

You should see 5 secrets listed.

---

### Step 4: Configure Supabase Redirect URLs

Go to: **Supabase Dashboard → Authentication → URL Configuration**

Add these redirect URLs:

```
https://gigledger-ten.vercel.app/auth/callback
gigledger://auth/callback
http://localhost:8090/auth/callback
```

---

### Step 5: Build Preview Versions

```bash
# Build iOS for TestFlight
eas build --platform ios --profile preview

# Build Android for Internal Testing
eas build --platform android --profile preview

# Or build both at once
eas build --platform all --profile preview
```

---

## 🎯 Quick Verification

After completing steps 1-3, verify everything is configured:

```bash
# Check EAS project
eas project:info

# Check secrets
eas secret:list

# Check if ready to build
eas build:configure
```

---

## 📋 Checklist

- [ ] Ran `eas init` and got Project ID
- [ ] Added Project ID to `.env` file
- [ ] Created 5 EAS secrets
- [ ] Verified secrets with `eas secret:list`
- [ ] Added 3 redirect URLs in Supabase Dashboard
- [ ] Ready to build with `eas build --platform all --profile preview`

---

## 🆘 If You Get Stuck

**Issue: "Project already exists"**
- Run: `eas project:info` to see your existing project ID
- Use that ID in your `.env` file

**Issue: "Secret already exists"**
- Delete it: `eas secret:delete --name EXPO_PUBLIC_SUPABASE_URL`
- Recreate it with the correct value

**Issue: "Build fails"**
- Check secrets: `eas secret:list`
- Verify all 5 secrets are set
- Try: `eas build --platform ios --profile preview --clear-cache`

---

**Next:** Once you complete these steps, you'll be ready to test Google sign-in on native devices!
