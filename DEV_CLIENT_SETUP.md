# Bozzy – Dev Client on Physical iPhone

Step-by-step checklist to get the Expo Dev Client running on your iPhone and to push builds to TestFlight.

---

## Prerequisites

- Apple Developer account enrolled (✅ already done)
- EAS CLI installed: `npm install -g eas-cli`
- Logged in: `eas login` (use `jkburkhardt1@gmail.com`)
- iPhone connected to the same Wi-Fi as your Mac

---

## Step 1 — Register your iPhone with EAS

EAS needs your device's UDID to provision it for internal distribution.

```bash
npm run ios:dev:device
# equivalent: eas device:create
```

- EAS will print a URL and QR code
- Open the URL on your iPhone in Safari
- Follow the prompt to install the provisioning profile
- Your device is now registered

> You only need to do this once per device. If you get a new iPhone, repeat this step.

---

## Step 2 — Build the Dev Client for your device

```bash
npm run ios:dev:build
# equivalent: eas build --platform ios --profile development-device
```

- This runs in EAS cloud (~10–20 min)
- When complete, EAS prints an install URL and QR code
- Open the URL on your iPhone in Safari and tap **Install**
- If prompted: **Settings → General → VPN & Device Management → [Your Apple ID] → Trust**

> This installs "Bozzy (dev)" — a special build that connects to your local dev server.

---

## Step 3 — Start the dev server

```bash
npm run ios:dev:run
# equivalent: npx expo start --dev-client
```

- Opens the Expo CLI in your terminal
- On your iPhone, open the Bozzy dev client app
- It will auto-detect the server on the same Wi-Fi, or scan the QR code shown in the terminal

---

## Bumping the build number

`appVersionSource` is set to `"local"` so the value in `app.config.js` is used directly.

To bump before a TestFlight or App Store build:

```js
// app.config.js
ios: {
  buildNumber: '2',   // ← increment this
  // version: '1.0.1' ← increment this for user-facing version changes
}
```

Increment `buildNumber` for every TestFlight upload. Increment `version` only for user-facing releases.

---

## TestFlight build + submit

```bash
# 1. Build
npm run ios:testflight:build
# equivalent: eas build --platform ios --profile production

# 2. Submit (after build completes)
npm run ios:testflight:submit
# equivalent: eas submit --platform ios --profile production --latest
```

The build uploads to App Store Connect automatically. Go to TestFlight in App Store Connect to add testers.

---

## Common failure modes

### "No devices registered" during build
- Run `npm run ios:dev:device` and register your iPhone first

### "Unable to connect to server" after installing dev client
- Make sure your Mac and iPhone are on the same Wi-Fi network
- Try pressing `s` in the Expo CLI terminal to switch to tunnel mode: `npx expo start --dev-client --tunnel`
- Check your Mac's firewall isn't blocking port 8081

### Google OAuth redirect fails in dev client
- The dev client uses bundle ID `com.bozzygigs.bozzy` so the redirect URI `bozzy://` is active
- In Supabase Dashboard → Authentication → URL Configuration, make sure `bozzy://` is in the redirect allow-list
- In Google Cloud Console → OAuth Client → Authorized redirect URIs, add:
  `https://jvostkeswuhfwntbrfzl.supabase.co/auth/v1/callback`

### "Provisioning profile doesn't include this device"
- Your iPhone's UDID isn't registered — run `npm run ios:dev:device` again
- Then rebuild: `npm run ios:dev:build`

### Expired certificates
- Run `eas credentials` to view/rotate iOS credentials
- EAS manages certificates automatically; if prompted, choose "Let EAS handle it"

### Wrong env vars (hitting localhost instead of production)
- The `development-device` profile sets `EXPO_PUBLIC_SITE_URL=https://bozzygigs.com`
- Confirm by checking `Constants.expoConfig.extra.siteUrl` in the app, or add a temporary log

### Build fails: "Missing push notification entitlement"
- Not required for dev builds — ignore this warning unless you're adding push notifications

---

## Quick reference

| Task | Command |
|---|---|
| Register iPhone | `npm run ios:dev:device` |
| Build dev client | `npm run ios:dev:build` |
| Start dev server | `npm run ios:dev:run` |
| Build for TestFlight | `npm run ios:testflight:build` |
| Submit to TestFlight | `npm run ios:testflight:submit` |
