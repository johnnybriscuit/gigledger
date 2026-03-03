# Mobile Auth & Native Fix Notes

## Issues Fixed

### A) `div` crash on native (Card.tsx render error)
The crash was NOT in `Card.tsx` itself (which is pure RN). The actual sources were:
- **`AppShell.tsx`**: sidebar nav items wrapped in `<div className="nav-item nav-X">` — replaced with `<View>` + web-only props via spread
- **`AccountScreen.tsx`**: action buttons wrapped in bare `<div>` — replaced with `<View>`
- **`DashboardTour.tsx`**: uses `react-joyride` which renders DOM elements. This component already only runs on web (it calls `document.querySelector`). No change needed — it will not be mounted on native as long as the parent guards it with `Platform.OS === 'web'`.

### B) Google OAuth / CSRF error on native
**Root cause**: `AuthScreen` was calling `fetch('/api/csrf-token')` with a relative URL, which fails on native (no base URL).

**Fixes**:
1. CSRF fetch is now skipped on native (`Platform.OS !== 'web'` guard).
2. Google OAuth on native now uses the `expo-auth-session` + `expo-web-browser` PKCE flow:
   - `WebBrowser.maybeCompleteAuthSession()` called at module scope
   - `supabase.auth.signInWithOAuth({ skipBrowserRedirect: true })` to get the OAuth URL
   - `WebBrowser.openAuthSessionAsync(url, redirectUrl)` to open the browser and capture the redirect
   - `supabase.auth.exchangeCodeForSession(code)` to exchange the PKCE code for a session

### C) Stripe red error overlay
**Root cause**: `console.error()` at module scope (outside any component) triggers the RN red overlay in dev.

**Fix**: Changed to `console.warn()` + added a `STRIPE_CONFIGURED` boolean flag. When Stripe is not configured, the `SubscriptionScreen` renders a friendly inline message instead of crashing.

### D) Safe area / status bar overlap
**Fix**: `AuthScreen` now wraps its root `ScrollView` in `<SafeAreaView>` from `react-native-safe-area-context`. The `App.tsx` root is already wrapped in `<SafeAreaProvider>` (added in previous session). `AppShell.tsx` already applies `insets.top` to the native header.

---

## Supabase Redirect URLs to Add

Go to: **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**

Add these:
```
bozzy://auth/callback
```

For Expo Go testing (the proxy URL printed by `makeRedirectUri` in dev — check the console log `[Auth] Native redirect URL:`):
```
exp://192.168.x.x:8081/--/auth/callback   (your local IP, printed in console)
```

> **Note**: In newer expo-auth-session, `makeRedirectUri({ scheme: 'bozzy', path: 'auth/callback' })` in Expo Go returns an `exp://` URL automatically. Check the console log for the exact value and add it to Supabase.

---

## Expo Config (app.config.js)
- `scheme: 'bozzy'` — already set ✅
- `ios.bundleIdentifier: 'com.bozzy.app'` — already set ✅
- `android.package: 'com.bozzy.app'` — already set ✅

---

## Environment Variables Needed

### Stripe (for SubscriptionScreen)
```
EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID_PROD=price_xxx
EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID_PROD=price_xxx
```
Fallbacks also supported (no `_PROD` suffix) for backward compatibility.

### Supabase (already configured)
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Testing Google OAuth in Expo Go

1. Run `npx expo start`
2. Note the `[Auth] Native redirect URL:` log line — add that URL to Supabase redirect URLs
3. Tap "Continue with Google" — browser opens
4. Sign in with Google
5. Browser redirects back to Expo Go
6. `exchangeCodeForSession` runs, session is set
7. App navigates to dashboard automatically via `onAuthStateChange`
