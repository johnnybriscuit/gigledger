# QA Checklist - Performance & UX Improvements

## Pre-Testing Setup

### Environment
- [ ] Clear browser cache and local storage
- [ ] Disable browser extensions
- [ ] Open DevTools Network tab
- [ ] Enable "Disable cache" in DevTools
- [ ] Test in incognito/private mode

### Test Accounts
- [ ] New user account (never logged in)
- [ ] Existing user with data
- [ ] Existing user without onboarding complete

## Part 1: New User Signup Flow

### Signup Process
- [ ] Navigate to signup page
- [ ] Enter email and password
- [ ] Submit form
- [ ] **Expected:** See branded loading screen with "Loading your dashboard..."
- [ ] **Expected:** No blank screens
- [ ] **Expected:** Transition to onboarding flow within 2 seconds

### Onboarding Flow
- [ ] Complete all onboarding steps
- [ ] Submit final step
- [ ] **Expected:** See loading screen briefly
- [ ] **Expected:** Land on dashboard with welcome toast
- [ ] **Expected:** Dashboard shows skeleton states while loading data
- [ ] **Expected:** Skeletons replaced with actual data within 1-2 seconds

### First Dashboard Load
- [ ] Check Network tab for request waterfall
- [ ] **Expected:** See parallel requests (not sequential)
- [ ] **Expected:** Profile and tax profile fetched together
- [ ] **Expected:** Gigs and payers prefetched
- [ ] Check Console for performance marks
- [ ] **Expected:** See "[Perf] bootstrap-ready: XXXms"
- [ ] **Expected:** See "[Perf] dashboard-mounted: XXXms"
- [ ] **Expected:** See "[Perf] dashboard-interactive: XXXms"

## Part 2: Existing User Login Flow

### Login Process
- [ ] Navigate to login page
- [ ] Enter credentials
- [ ] Submit form
- [ ] **Expected:** See branded loading screen
- [ ] **Expected:** No blank screens
- [ ] **Expected:** Land on dashboard within 1-2 seconds

### Dashboard Load
- [ ] **Expected:** See skeleton cards while data loads
- [ ] **Expected:** Gig list shows 3-5 skeleton cards
- [ ] **Expected:** Dashboard widgets show skeleton states
- [ ] **Expected:** Skeletons replaced with data smoothly
- [ ] **Expected:** No "jumping" or layout shifts
- [ ] **Expected:** Totals show skeleton until calculated (not $0.00)

### Data Accuracy
- [ ] Verify gig count matches expected
- [ ] Verify totals are correct (not duplicated)
- [ ] Verify payers list is complete
- [ ] Verify expenses are shown
- [ ] Check that data belongs to logged-in user only

## Part 3: Slow Network Simulation

### Chrome DevTools Throttling
- [ ] Open DevTools → Network tab
- [ ] Select "Slow 3G" from throttling dropdown
- [ ] Refresh page while logged in

### Expected Behavior
- [ ] See loading screen immediately
- [ ] After 5 seconds, see "Still loading..." message
- [ ] Eventually see dashboard with skeletons
- [ ] Data loads progressively
- [ ] No timeout errors
- [ ] No infinite loading state

### Fast 3G Test
- [ ] Switch to "Fast 3G"
- [ ] Refresh page
- [ ] **Expected:** Faster load but still shows loading screen
- [ ] **Expected:** Smooth transition to dashboard

## Part 4: Error Handling

### Network Error Simulation
- [ ] Open DevTools → Network tab
- [ ] Enable "Offline" mode
- [ ] Refresh page
- [ ] **Expected:** See error screen with retry button
- [ ] **Expected:** Error message is user-friendly
- [ ] Disable offline mode
- [ ] Click "Try Again" button
- [ ] **Expected:** Successfully loads dashboard

### Session Expiry
- [ ] Log in successfully
- [ ] Manually clear session in DevTools (Application → Local Storage)
- [ ] Refresh page
- [ ] **Expected:** Redirected to login screen (not error)

### Bootstrap Timeout
- [ ] Simulate very slow network (custom throttling: 1kb/s)
- [ ] Refresh page
- [ ] Wait 15+ seconds
- [ ] **Expected:** See timeout error with retry button
- [ ] Improve network speed
- [ ] Click retry
- [ ] **Expected:** Successfully loads

## Part 5: Page Refresh While Logged In

### Hard Refresh
- [ ] Log in and navigate to dashboard
- [ ] Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- [ ] **Expected:** See loading screen briefly
- [ ] **Expected:** Return to dashboard quickly
- [ ] **Expected:** Data is still correct
- [ ] **Expected:** No duplicate gigs or expenses

### Soft Refresh
- [ ] Press Cmd+R (Mac) or Ctrl+R (Windows)
- [ ] **Expected:** Even faster load (uses cache)
- [ ] **Expected:** Still shows loading screen
- [ ] **Expected:** Data is fresh

## Part 6: Logout and Re-login

### Logout Process
- [ ] Click logout button
- [ ] **Expected:** Immediate redirect to login screen
- [ ] **Expected:** No cached data visible

### Re-login
- [ ] Log in with same account
- [ ] **Expected:** See loading screen
- [ ] **Expected:** Dashboard loads correctly
- [ ] **Expected:** No data from previous session
- [ ] **Expected:** Totals are correct (not doubled)

## Part 7: Manual Refresh Button

### Refresh Functionality
- [ ] Navigate to dashboard
- [ ] Add a new gig in another tab/window
- [ ] Return to dashboard
- [ ] Click "Refresh" button (if implemented)
- [ ] **Expected:** Data updates to show new gig
- [ ] **Expected:** Brief loading state
- [ ] **Expected:** Smooth transition

## Part 8: Mobile Web Viewport

### Responsive Testing
- [ ] Open DevTools → Device Toolbar
- [ ] Select "iPhone 12 Pro"
- [ ] Test login flow
- [ ] **Expected:** Loading screen fits viewport
- [ ] **Expected:** Dashboard is responsive
- [ ] **Expected:** Skeletons match mobile layout
- [ ] **Expected:** No horizontal scroll

### Touch Interactions
- [ ] Test all buttons with touch simulation
- [ ] **Expected:** Buttons respond to touch
- [ ] **Expected:** No double-tap zoom issues

## Part 9: Performance Metrics

### DevTools Performance Tab
- [ ] Open DevTools → Performance tab
- [ ] Start recording
- [ ] Refresh page while logged in
- [ ] Stop recording after dashboard loads
- [ ] Analyze timeline

### Expected Metrics
- [ ] **First Contentful Paint (FCP):** < 1.5s
- [ ] **Largest Contentful Paint (LCP):** < 2.5s
- [ ] **Time to Interactive (TTI):** < 3s
- [ ] **Total Blocking Time (TBT):** < 300ms

### Console Performance Report
- [ ] Check console for performance report
- [ ] **Expected:** See table with all marks
- [ ] **Expected:** See measurements between marks
- [ ] Record metrics for comparison

## Part 10: Edge Cases

### Multiple Tabs
- [ ] Open app in two tabs
- [ ] Log in on tab 1
- [ ] Switch to tab 2
- [ ] Refresh tab 2
- [ ] **Expected:** Tab 2 recognizes session
- [ ] **Expected:** Both tabs show same data

### Browser Back Button
- [ ] Navigate from dashboard to account screen
- [ ] Click browser back button
- [ ] **Expected:** Return to dashboard smoothly
- [ ] **Expected:** No re-bootstrap

### Rapid Navigation
- [ ] Quickly switch between tabs (dashboard, gigs, expenses)
- [ ] **Expected:** No loading screens between tabs
- [ ] **Expected:** Data persists in cache
- [ ] **Expected:** Smooth transitions

## Part 11: Data Integrity

### No Duplicate Data
- [ ] Log in
- [ ] Check gig count
- [ ] Refresh page 3 times
- [ ] **Expected:** Gig count stays the same
- [ ] **Expected:** No duplicate entries

### Correct Totals
- [ ] Note total income on dashboard
- [ ] Navigate to gigs screen
- [ ] Sum up gigs manually
- [ ] **Expected:** Totals match
- [ ] **Expected:** No race condition errors

### User Data Isolation
- [ ] Log in as User A
- [ ] Note their data
- [ ] Log out
- [ ] Log in as User B
- [ ] **Expected:** See User B's data only
- [ ] **Expected:** No cache bleeding from User A

## Issues to Report

For each failed test, document:
1. **Test step:** Which step failed
2. **Expected behavior:** What should happen
3. **Actual behavior:** What actually happened
4. **Screenshots:** If applicable
5. **Console errors:** Copy any errors
6. **Network tab:** Screenshot of request waterfall
7. **Reproducibility:** Can you reproduce it consistently?

## Success Criteria

All tests must pass with:
- ✅ No blank screens during load
- ✅ Clear loading states with skeletons
- ✅ Error states with retry functionality
- ✅ No duplicate data
- ✅ Correct totals
- ✅ Fast load times (< 2s on good connection)
- ✅ Graceful degradation on slow connections
- ✅ Mobile responsive
- ✅ No console errors
- ✅ Performance metrics within targets
