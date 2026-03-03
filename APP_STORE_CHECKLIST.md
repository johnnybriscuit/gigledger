# Release Checklist
**Goal: Ship Bozzy to TestFlight, then the App Store**

---

## Before every build — bump the version

**File to edit:** `app.config.js`

```js
ios: {
  buildNumber: '2',   // ← bump this for EVERY TestFlight upload (Apple requires unique)
  // version stays '1.0.0' until you ship a user-facing feature update
}
```

**Rules:**
- `buildNumber` — must increase with every upload to TestFlight/App Store. Never reuse a number.
- `version` — the user-facing version (e.g. `1.0.0` → `1.0.1`). Only bump when shipping meaningful changes to users.
- Also bump `android.versionCode` by 1 if doing an Android build at the same time.

**Example progression:**
| Release | version | buildNumber |
|---|---|---|
| First TestFlight | 1.0.0 | 1 |
| Second TestFlight (bug fixes) | 1.0.0 | 2 |
| First public release | 1.0.0 | 3 |
| First update | 1.0.1 | 4 |

---

## Step 1 — Build for production

```bash
npm run ios:build:testflight
```
- Runs in EAS cloud (~15–40 min on free tier)
- Press Ctrl+C after "Build queued" if you want your terminal back — build keeps running
- Monitor at: `https://expo.dev/accounts/jkburkh23/projects/gigledger/builds`

---

## Step 2 — Submit to App Store Connect

Once the build shows **finished** in EAS:
```bash
npm run ios:submit:testflight
```
- EAS automatically uploads the latest finished production build to App Store Connect
- Uses credentials already in `eas.json` (appleId, ascAppId, appleTeamId) — no prompts needed

---

## Step 3 — Find it in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Select **Bozzy Gigs**
3. Click **TestFlight** tab
4. Under **iOS Builds**, your new build appears (may take 5–10 min to process after upload)
5. If prompted to answer export compliance — answer **No** (standard HTTPS only)

---

## Step 4 — Add internal testers (TestFlight)

1. In TestFlight → **Internal Testing** → click **+** next to testers
2. Add by Apple ID email (must be invited to your App Store Connect team first)
3. They get an email with a TestFlight install link — no device registration needed

**For external testers** (people outside your team):
1. TestFlight → **External Testing** → **+** New Group
2. Add testers by email
3. Apple does a brief review of the build (~1 day) before external testers can install

---

## Step 5 — Install via TestFlight (testers)

1. Download **TestFlight** app from the App Store (free)
2. Open the install email link on iPhone, or open TestFlight → the app appears automatically
3. Tap **Install**

---

## Step 6 — Submit for App Store Review

When you're ready to go live (not just TestFlight):

1. In App Store Connect → **Distribution** → **iOS App** → **1.0 Prepare for Submission**
2. Verify all green checkmarks:
   - Screenshots ✅
   - Description, Keywords, Support URL ✅
   - App Privacy ✅
   - Pricing (Free) ✅
   - Build selected ✅ (select the TestFlight build you've tested)
3. Fill **App Review Information**:
   - Sign-in required: **Yes**
   - Username: `reviewer@bozzygigs.com` (create this demo account in Supabase first)
   - Password: something simple, e.g. `BozzyReview2026!`
   - Notes: *"Login required. Use provided credentials. Demo account pre-populated with sample data."*
4. Click **Add for Review** → **Submit**
5. Review typically takes **1–3 business days**

---

## ⚠️ Sign in with Apple — required before App Review

**If Bozzy offers Google OAuth login, Apple requires you to also offer Sign in with Apple before the app can be approved.**

Apple's rule: *"Apps that use a third-party login service must also offer Sign in with Apple."*

This is a **code change** — it's not implemented yet. You'll need to add it before your first App Store submission or Apple will reject the build. Plan for this before submitting.

Options:
- Add `expo-apple-authentication` for native Sign in with Apple
- Supabase supports Apple OAuth — it can be added similarly to Google OAuth

---

## Quick reference

| Task | Command |
|---|---|
| Bump build number | Edit `buildNumber` in `app.config.js` |
| Build for TestFlight | `npm run ios:build:testflight` |
| Submit to TestFlight | `npm run ios:submit:testflight` |
| Check build status | `https://expo.dev/accounts/jkburkh23/projects/gigledger/builds` |
| App Store Connect | `https://appstoreconnect.apple.com` |
