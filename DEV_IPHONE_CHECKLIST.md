# Dev iPhone — TODAY Checklist
**Goal: Get the current Bozzy dev build running on your physical iPhone**

---

## One-time setup (do this once, then skip forever)

### Step 1 — Register your iPhone with EAS
```bash
npm run ios:device:register
```
- EAS prints a URL → open it in **Safari on your iPhone** → install the profile
- Tap Allow/Install when prompted
- Done. Your device is registered. Never need to do this again for this iPhone.

---

## Every time you want a new build on your iPhone

### Step 2 — Build the dev client
```bash
npm run ios:build:dev
```
- This runs in EAS cloud. **Takes ~15–40 min on free tier.**
- Press Ctrl+C after it says "Build queued" if you want your terminal back — **the build keeps running in the cloud.**
- **Do NOT run this command again** while a build is already queued/running. Check status at:
  `https://expo.dev/accounts/jkburkh23/projects/gigledger/builds`

### Step 3 — Install on your iPhone
When the build finishes, EAS emails you and shows a link like:
```
https://expo.dev/accounts/jkburkh23/projects/gigledger/builds/[BUILD-ID]
```
- Open that link in **Safari on your iPhone** (not Chrome, not the camera QR scanner)
- Tap **Install**
- Go to **Settings → General → VPN & Device Management → Apple Development: jkburkhardt1@gmail.com → Trust**
- Open Bozzy from your home screen — it will show the dev launcher screen

> **Already have Bozzy installed?** If the old dev build is on your phone, just install the new one over it. No need to delete first. If the app icon shows a plain white/blank icon after install, delete and reinstall.

---

## Every time you want to develop (hot reload, logs, etc.)

### Step 4 — Start the dev server
```bash
npm run ios:run:dev
```
This starts Metro bundler. Your terminal will show a QR code and a URL like:
```
exp+bozzy://expo-development-client/?url=http%3A%2F%2F192.168.x.x%3A8081
```

### Step 5 — Connect your iPhone WITHOUT scanning the QR

**Option A (easiest) — shake your phone:**
- Open Bozzy on your iPhone
- Shake the device → tap "Enter URL manually"
- Type: `http://192.168.x.x:8081` (use the IP shown in your terminal)

**Option B — copy the deep link:**
- Copy the full `exp+bozzy://expo-development-client/?url=...` URL from your terminal
- AirDrop or iMessage it to your iPhone, tap it

**Option C — if on same Wi-Fi:**
- Bozzy dev client auto-detects Metro on the same network
- Just open the app and wait 3–5 seconds — it should connect automatically

---

## Troubleshooting

### "Provisioning profile is missing the following devices"
When running `npm run ios:build:dev`, EAS asks:
> "Would you like to choose the devices to provision again?"

**Answer: YES** — this adds your iPhone to the profile so the build installs correctly.

### App won't connect to Metro / "Unable to connect to development server"
Your iPhone and Mac may be on different networks. Use tunnel mode:
```bash
npx expo start --dev-client --tunnel
```
This routes traffic through Expo's servers so network doesn't matter. Slightly slower but always works.

### Wrong scheme showing `com.anonymous.gigledger` in Metro URL
This means Expo is using the wrong config. Fix:
```bash
npx expo start --dev-client --clear
```
The `--clear` flag resets the Metro cache. The URL should then show `bozzy://` or `com.bozzygigs.bozzy://`.

### Build stuck / "concurrency limit reached"
You have multiple builds queued. Check and cancel extras:
```bash
eas build:list --platform ios --limit 5 --non-interactive
eas build:cancel [OLD-BUILD-ID]
```
Keep only the most recent one.

### App opens but shows blank/white screen
- Make sure Metro is running (`npm run ios:run:dev`)
- Check your Mac's IP hasn't changed (reconnect to Wi-Fi)
- Try tunnel: `npx expo start --dev-client --tunnel`

### Google OAuth doesn't work
The dev client uses bundle ID `com.bozzygigs.bozzy` so OAuth should work. If it fails:
- Check Supabase Dashboard → Authentication → URL Configuration
- Make sure `bozzy://` is in the allowed redirect URLs list

---

## Local Build Fix (if EAS cloud queue is too slow)

If you see: **"Distribution certificate with fingerprint … hasn't been imported successfully"**
when running `eas build --local`, fix it in this order:

### 1. Verify Xcode + Command Line Tools
```bash
xcode-select --print-path
# Should print: /Applications/Xcode.app/Contents/Developer
# If not, run:
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
xcodebuild -version
# Should print Xcode 15.x or 16.x
```

### 2. Accept Xcode license (if never done)
```bash
sudo xcodebuild -license accept
```

### 3. Install/verify Apple WWDR certificate
The Apple Worldwide Developer Relations cert must be trusted in your keychain.
1. Open **Keychain Access** (Spotlight → "Keychain Access")
2. In the search box type: `Apple Worldwide Developer`
3. You should see **Apple Worldwide Developer Relations Certification Authority** — it must show a blue ✓ trusted icon
4. If it's missing or shows red X:
   - Download from: https://www.apple.com/certificateauthority/
   - Download **Worldwide Developer Relations - G4** (the current one)
   - Double-click the downloaded `.cer` file to install it
   - Right-click it in Keychain Access → Get Info → Trust → "When using this certificate" → **Always Trust**

### 4. Pull your distribution cert from EAS into your local keychain
```bash
eas credentials
```
- Select **iOS** → **Ad Hoc** (for development-device) or **Distribution** (for production)
- Choose **Download existing credentials**
- This downloads the `.p12` certificate — double-click it to install into Keychain Access
- When prompted for a password, use the one EAS shows or leave blank and try empty

### 5. Retry the local build
```bash
eas build --platform ios --profile development-device --local
```

### 6. If the cert still fails — nuke and regenerate
```bash
eas credentials
# Select iOS → Ad Hoc → Remove credentials → confirm
# Then re-run the build — EAS will generate fresh certs
npm run ios:build:dev
```
> ⚠️ Only do step 6 if steps 1–5 don't fix it. Regenerating certs invalidates existing provisioning profiles.

---

## Quick reference — commands

| What | Command |
|---|---|
| Register iPhone (one-time) | `npm run ios:device:register` |
| Build dev client (cloud) | `npm run ios:build:dev` |
| Build dev client (local) | `eas build --platform ios --profile development-device --local` |
| Start dev server | `npm run ios:run:dev` |
| Start with tunnel (network fix) | `npx expo start --dev-client --tunnel` |
| Check active builds | `eas build:list --platform ios --limit 5 --non-interactive` |
| Cancel a stuck build | `eas build:cancel [BUILD-ID]` |
