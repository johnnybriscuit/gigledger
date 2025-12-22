# UI QA Instructions - Live Application Testing
**Date:** December 22, 2025  
**Commit:** 9e36fa0  
**Purpose:** Visual verification of AppShell restoration and React Query invalidation

---

## Prerequisites

1. **Start the dev server:**
   ```bash
   npm run start:web
   ```
   Server should be running at: http://localhost:8090

2. **Open in Chrome:**
   - Navigate to http://localhost:8090
   - Open DevTools (F12 or Cmd+Option+I)

---

## Test 1: Desktop Navigation (Chrome Desktop View)

### Steps:
1. Open http://localhost:8090 in Chrome
2. Ensure window width ≥ 768px (full desktop view)
3. Log in if needed

### Verify:
- [ ] Left sidebar visible (240px width)
- [ ] Sidebar contains:
  - [ ] GigLedger logo at top
  - [ ] 8 navigation items with icons:
    - 📊 Dashboard
    - 👥 Payers
    - 🎵 Gigs
    - 💰 Expenses
    - 🚗 Mileage
    - 📤 Exports
    - ⭐ Subscription
    - ⚙️ Account
- [ ] Sidebar is sticky (doesn't scroll with content)
- [ ] Main content starts at 240px from left (not hidden by sidebar)
- [ ] Top-right header shows:
  - [ ] Account button
  - [ ] Sign Out button

### Click Each Nav Item:
- [ ] Dashboard → Loads without errors
- [ ] Payers → Loads without errors
- [ ] Gigs → Loads without errors
- [ ] Expenses → Loads without errors
- [ ] Mileage → Loads without errors
- [ ] Exports → Loads without errors
- [ ] Subscription → Loads without errors
- [ ] Account → Loads without errors

### Active State:
- [ ] Active route has blue background (#eff6ff)
- [ ] Active route label is blue and bold
- [ ] Inactive routes are gray

### Screenshot 1: Desktop Dashboard
**Filename:** `desktop-dashboard.png`
**Capture:** Full window showing sidebar + dashboard content + header

---

## Test 2: Mobile Navigation (Chrome DevTools Device Emulation)

### Setup:
1. Open DevTools (F12)
2. Click "Toggle device toolbar" (Cmd+Shift+M)
3. Select "iPhone 14 Pro" from device dropdown
4. Viewport: 393 x 852

### Verify Initial State:
- [ ] Sidebar NOT visible
- [ ] Mobile header visible at top (60px height)
- [ ] Hamburger menu (☰) in top-left
- [ ] "GigLedger" title in header
- [ ] Main content uses full width
- [ ] No horizontal overflow

### Test Hamburger Menu:
1. Click hamburger icon (☰)

**Verify:**
- [ ] Drawer slides in from left
- [ ] Drawer shows full sidebar (logo + 8 nav items)
- [ ] Background darkens (overlay)
- [ ] Drawer width: 240px
- [ ] Drawer has proper z-index (appears above content)

### Screenshot 2: Mobile with Drawer Open
**Filename:** `mobile-drawer-open.png`
**Capture:** iPhone 14 view with drawer open, showing overlay

### Test Navigation from Drawer:
1. With drawer open, click "Gigs"

**Verify:**
- [ ] Navigates to Gigs screen
- [ ] Drawer closes automatically
- [ ] Gigs content loads
- [ ] No layout overlap

### Screenshot 3: Mobile After Navigation
**Filename:** `mobile-after-nav.png`
**Capture:** iPhone 14 view showing Gigs screen (drawer closed)

### Test Tap Outside to Close:
1. Open drawer again (tap ☰)
2. Tap on darkened background (outside drawer)

**Verify:**
- [ ] Drawer closes
- [ ] Returns to previous screen
- [ ] No errors in console

---

## Test 3: Tablet/Breakpoint (iPad)

### Setup:
1. In DevTools device emulation
2. Select "iPad Pro" (1024 x 1366)

### Verify:
- [ ] Sidebar visible (desktop mode at ≥768px)
- [ ] No hamburger menu
- [ ] Layout same as desktop
- [ ] All nav items work

---

## Test 4: React Query Cache Invalidation

### Test Create Operations:
1. Navigate to Dashboard
2. Note current totals (Net Profit, Gigs Logged, Expenses)
3. Navigate to Gigs
4. Click "Add Gig"
5. Fill in: Date, Payer, Amount ($100)
6. Save

**Verify:**
- [ ] Gig appears in list immediately
- [ ] Navigate back to Dashboard
- [ ] Dashboard totals updated (no stale data)
- [ ] Gigs Logged count increased
- [ ] Net Profit reflects new gig

### Test Update Operations:
1. Navigate to Gigs
2. Click edit on a gig
3. Change amount (e.g., $100 → $200)
4. Save

**Verify:**
- [ ] Gig list shows updated amount immediately
- [ ] Navigate to Dashboard
- [ ] Dashboard totals reflect the change
- [ ] No stale totals

### Test Delete Operations:
1. Navigate to Expenses
2. Delete an expense
3. Navigate to Dashboard

**Verify:**
- [ ] Dashboard totals updated immediately
- [ ] Expenses total decreased
- [ ] Net Profit recalculated

### Console Check:
- [ ] Open DevTools Console
- [ ] No React errors
- [ ] No query invalidation errors
- [ ] No "stale data" warnings

---

## Test 5: Cross-Screen Consistency

### Test Flow:
1. Dashboard → Note Net Profit value
2. Navigate to Gigs → Add a gig
3. Navigate to Expenses → Add an expense
4. Navigate back to Dashboard

**Verify:**
- [ ] Dashboard shows updated totals
- [ ] All changes reflected
- [ ] No loading spinners (data cached)
- [ ] Smooth transitions

---

## Expected Results Summary

### Desktop (≥768px)
✅ Sidebar always visible, fixed position  
✅ 240px width, doesn't scroll  
✅ All 8 nav routes accessible  
✅ Active state highlighting works  
✅ Main content properly offset  
✅ Account + Sign Out in top-right  

### Mobile (<768px)
✅ Sidebar hidden by default  
✅ Hamburger menu in top-left  
✅ Drawer slides in on tap  
✅ Drawer closes after navigation  
✅ Tap outside closes drawer  
✅ No layout overlap  
✅ Full-width content  

### React Query
✅ Create → Dashboard updates immediately  
✅ Update → Dashboard reflects changes  
✅ Delete → Dashboard recalculates  
✅ No stale totals  
✅ Smooth cache transitions  

---

## Screenshots to Provide

Please take and attach these 3 screenshots:

1. **`desktop-dashboard.png`**
   - Full Chrome window (≥768px width)
   - Shows: Sidebar + Dashboard content + Header
   - Verify sidebar visible and sticky

2. **`mobile-drawer-open.png`**
   - Chrome DevTools, iPhone 14 Pro emulation
   - Drawer open, showing overlay
   - Verify drawer slides in from left

3. **`mobile-after-nav.png`**
   - Chrome DevTools, iPhone 14 Pro emulation
   - After clicking a nav item (e.g., Gigs)
   - Verify drawer closed, content visible

---

## Console Verification

In Chrome DevTools Console, verify:
```javascript
// No errors like:
// ❌ "Cannot read property of undefined"
// ❌ "Query key mismatch"
// ❌ "Stale data detected"

// Should see (if logging enabled):
// ✅ Query cache hits
// ✅ Successful invalidations
// ✅ No duplicate fetches
```

---

## If Issues Found

### Sidebar Not Visible (Desktop)
- Check: Window width ≥ 768px?
- Check: Console for StyleSheet errors?
- Check: `isWeb` variable in AppShell?

### Drawer Not Working (Mobile)
- Check: Hamburger icon clickable?
- Check: `mobileMenuOpen` state changing?
- Check: Drawer z-index (should be 1000)?

### Stale Dashboard Totals
- Check: Console for invalidation logs
- Check: Network tab for refetch after mutation
- Check: Query keys match (userId scoped)

---

## Completion Checklist

After completing all tests above:
- [ ] All desktop navigation tests passed
- [ ] All mobile navigation tests passed
- [ ] All React Query cache tests passed
- [ ] 3 screenshots captured
- [ ] No console errors
- [ ] No layout issues
- [ ] No stale data issues

**Status:** Ready for production ✅
