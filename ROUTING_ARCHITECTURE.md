# GigLedger Routing Architecture

## Overview

GigLedger uses a clear separation between public marketing pages and the authenticated application to ensure a professional first impression and clean mobile experience.

## Route Structure

```
/ (landing)           → Public landing page (NO AppShell)
/auth                 → Authentication screen (NO AppShell)
/terms                → Terms of Service (NO AppShell)
/privacy              → Privacy Policy (NO AppShell)
/forgot-password      → Password reset (NO AppShell)
/reset-password       → Password reset confirmation (NO AppShell)

/app/dashboard        → Authenticated dashboard (WITH AppShell)
/app/gigs             → Gigs screen (WITH AppShell)
/app/expenses         → Expenses screen (WITH AppShell)
/app/mileage          → Mileage screen (WITH AppShell)
/app/payers           → Payers screen (WITH AppShell)
/app/invoices         → Invoices screen (WITH AppShell)
/app/exports          → Exports screen (WITH AppShell)
/app/subscription     → Subscription screen (WITH AppShell)
/app/account          → Account settings (WITH AppShell)
```

## Key Principles

### 1. Public Pages (NO AppShell)
- **Landing page** (`/`) - First impression for new users
- **Auth pages** (`/auth`, `/login`, `/signup`) - Clean authentication experience
- **Legal pages** (`/terms`, `/privacy`) - Accessible without authentication

**Requirements:**
- Mobile-first design
- No sidebar or dashboard layout
- No blank margins or offset issues
- Clean, professional appearance on iPhone Safari
- Fast loading, minimal dependencies

### 2. Authenticated App (WITH AppShell)
- **Dashboard** (`/app/dashboard`) - Main application interface
- **All feature screens** (`/app/*`) - Full application functionality

**Requirements:**
- Sidebar navigation on desktop
- Mobile drawer on mobile devices
- Consistent layout across all authenticated screens
- UserContext and authentication required

## Component Architecture

### Public Landing Page
**File:** `src/screens/PublicLandingPage.tsx`

**Features:**
- Mobile-first responsive design
- Hero section with clear value proposition
- How It Works (3 steps)
- Feature highlights (6 features)
- Pricing teaser (Free + Pro)
- Final CTA section
- Clean footer

**Technical:**
- Standalone component (no AppShell dependency)
- Uses native ScrollView for smooth mobile scrolling
- Proper mobile breakpoints (< 768px)
- No sidebar offset or margin issues

### Auth Screens
**Files:** 
- `src/screens/AuthScreen.tsx`
- `src/screens/ForgotPasswordScreen.tsx`
- `src/screens/ResetPasswordScreen.tsx`

**Features:**
- Clean, focused authentication UI
- No distractions from sidebar or dashboard
- Mobile-optimized forms

### Dashboard (Authenticated)
**File:** `src/screens/DashboardScreen.tsx`

**Features:**
- Uses AppShell for consistent layout
- Sidebar navigation on desktop
- Mobile drawer on mobile
- Full dashboard functionality

## Mobile Considerations

### iPhone Safari Optimizations
1. **No blank margins** - Public pages use full width on mobile
2. **No sidebar offset** - AppShell only applies to `/app/*` routes
3. **Smooth scrolling** - Native ScrollView for better performance
4. **Touch-friendly** - Proper button sizes and spacing
5. **Fast loading** - Minimal dependencies on public pages

### Responsive Breakpoints
- **Mobile:** < 768px width
- **Desktop:** >= 768px width

## Implementation Details

### App.tsx Route Logic
```typescript
// Public landing page (NO AppShell)
if (currentRoute === 'landing') {
  return <PublicLandingPage />;
}

// Auth pages (NO AppShell)
if (currentRoute === 'auth') {
  return <AuthScreen />;
}

// Authenticated app (WITH AppShell)
if (bootstrap.status === 'ready') {
  return (
    <UserProvider>
      <DashboardScreen /> {/* DashboardScreen uses AppShell internally */}
    </UserProvider>
  );
}
```

### Navigation Flow
1. User visits `/` → Sees PublicLandingPage
2. Clicks "Get Started" or "Sign In" → Routes to `/auth`
3. Authenticates → Routes to `/app/dashboard`
4. All authenticated routes use AppShell for consistent layout

## Future Enhancements

### Planned Improvements
- [ ] Add proper URL routing (currently using state-based routing)
- [ ] Implement `/login` and `/signup` as separate routes
- [ ] Add deep linking for `/app/*` routes
- [ ] SEO optimization for public pages
- [ ] Add meta tags and Open Graph tags for social sharing

### URL Routing Migration
Currently using state-based routing (`currentRoute` state). Future migration to proper URL routing:
- Use React Router or Expo Router
- Enable browser back/forward navigation
- Support deep linking to specific screens
- Better SEO for public pages

## Testing Checklist

### Mobile Safari (iPhone)
- [ ] Landing page loads without blank margins
- [ ] No sidebar offset on public pages
- [ ] Buttons are touch-friendly (min 44px)
- [ ] Scrolling is smooth
- [ ] Text is readable without zooming
- [ ] CTAs are prominent and clickable

### Desktop
- [ ] Landing page is centered and readable
- [ ] Auth pages are clean and focused
- [ ] Dashboard has sidebar navigation
- [ ] All authenticated screens use AppShell

### Navigation
- [ ] Landing → Auth works
- [ ] Auth → Dashboard works (after login)
- [ ] Dashboard → All feature screens work
- [ ] Sign out → Returns to landing page

## Troubleshooting

### Issue: Blank margins on mobile
**Cause:** AppShell applying sidebar offset to public pages
**Solution:** Ensure public pages don't use AppShell

### Issue: Sidebar showing on landing page
**Cause:** AppShell mounting on public routes
**Solution:** Check route logic in App.tsx - AppShell should only mount for authenticated routes

### Issue: Mobile scrolling issues
**Cause:** Incorrect ScrollView configuration
**Solution:** Use native ScrollView with `showsVerticalScrollIndicator={false}`

## Maintenance Notes

### When Adding New Public Pages
1. Create component in `src/screens/`
2. Add route to `App.tsx` (before authenticated check)
3. Ensure NO AppShell dependency
4. Test on mobile Safari
5. Update this documentation

### When Adding New Authenticated Screens
1. Create component in `src/screens/`
2. Add to DashboardScreen navigation
3. Ensure AppShell is used for layout
4. Add to sidebar navigation
5. Test navigation flow

## Related Files

- `src/screens/PublicLandingPage.tsx` - Public landing page
- `src/screens/AuthScreen.tsx` - Authentication
- `src/screens/DashboardScreen.tsx` - Main authenticated app
- `src/components/layout/AppShell.tsx` - Authenticated app layout
- `App.tsx` - Main routing logic

---

**Last Updated:** January 8, 2025
**Version:** 1.0
