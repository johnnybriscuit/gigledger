# Top 15 Must-Pass Tests - Login/Dashboard UX

## Critical Path Tests (Must Pass Before Production)

### 1. ✅ New User Signup → Dashboard
**Test:**
1. Sign up with new email/password
2. Complete onboarding flow
3. Land on dashboard

**Expected:**
- ✅ See branded loading screen (not blank)
- ✅ Loading screen shows "Loading your dashboard..."
- ✅ Transition to dashboard within 2 seconds
- ✅ Dashboard shows skeleton cards while loading
- ✅ Skeletons replaced with actual data smoothly
- ✅ No blank screens at any point

**Console check:**
```
[Perf] bootstrap-ready: <850ms
[Perf] dashboard-mounted: <1200ms
[Perf] dashboard-interactive: <1500ms
```

---

### 2. ✅ Existing User Login → Dashboard
**Test:**
1. Log in with existing credentials
2. Land on dashboard

**Expected:**
- ✅ See branded loading screen immediately
- ✅ Dashboard loads within 1-2 seconds
- ✅ Skeleton states show while data loads
- ✅ No "jumping" or layout shifts
- ✅ Totals show skeletons (not $0.00)

**Console check:**
```
[Perf] bootstrap-ready: <800ms
[Perf] dashboard-interactive: <1200ms
```

---

### 3. ✅ Slow Network (3G) - No Infinite Spinner
**Test:**
1. Open DevTools → Network → Select "Slow 3G"
2. Refresh page while logged in

**Expected:**
- ✅ See loading screen immediately
- ✅ Loading screen persists (no blank)
- ✅ Eventually see dashboard with skeletons
- ✅ Data loads progressively
- ✅ **No timeout after 15 seconds** (should show error screen)

---

### 4. ✅ Network Error → Retry Works
**Test:**
1. Open DevTools → Network → Enable "Offline"
2. Refresh page
3. See error screen
4. Disable offline mode
5. Click "Try Again"

**Expected:**
- ✅ Error screen shows with friendly message
- ✅ "Try Again" button visible
- ✅ After retry, successfully loads dashboard
- ✅ No infinite loading state

---

### 5. ✅ Page Refresh While Logged In
**Test:**
1. Log in and navigate to dashboard
2. Press Cmd+R (Mac) or Ctrl+R (Windows)

**Expected:**
- ✅ See loading screen briefly
- ✅ Return to dashboard quickly (<1s)
- ✅ Data is still correct
- ✅ No duplicate gigs or expenses

---

### 6. ✅ Logout → Re-login (No Cache Bleeding)
**Test:**
1. Log in as User A, note their data
2. Log out
3. Log in as User B

**Expected:**
- ✅ See User B's data only
- ✅ No cached data from User A
- ✅ Totals are correct for User B
- ✅ No duplicate entries

---

### 7. ✅ Gigs List Shows Skeletons
**Test:**
1. Navigate to Gigs tab
2. Observe loading state

**Expected:**
- ✅ See 5 skeleton gig cards (not spinner)
- ✅ Skeletons animate (pulsing effect)
- ✅ Skeletons replaced with actual gigs
- ✅ No blank space while loading

---

### 8. ✅ Dashboard Totals Don't Jump
**Test:**
1. Navigate to dashboard
2. Watch totals load

**Expected:**
- ✅ Totals show skeleton state (not $0.00)
- ✅ When data loads, totals appear correctly
- ✅ No "jumping" from $0 to actual value
- ✅ Layout doesn't shift

---

### 9. ✅ Performance Marks in Console
**Test:**
1. Open browser console
2. Log in
3. Check console output

**Expected:**
- ✅ See `[Perf] bootstrap-ready: XXXms`
- ✅ See `[Perf] dashboard-mounted: XXXms`
- ✅ See `[Perf] dashboard-interactive: XXXms`
- ✅ See "📊 Performance Report" message
- ✅ Can run `perf.getReport()` for full details

---

### 10. ✅ Mobile Web Viewport
**Test:**
1. Open DevTools → Device Toolbar
2. Select "iPhone 12 Pro"
3. Test login flow

**Expected:**
- ✅ Loading screen fits viewport
- ✅ Dashboard is responsive
- ✅ Skeletons match mobile layout
- ✅ No horizontal scroll
- ✅ Touch interactions work

---

### 11. ✅ No Duplicate Data After Refresh
**Test:**
1. Log in, note gig count
2. Refresh page 3 times
3. Check gig count

**Expected:**
- ✅ Gig count stays the same
- ✅ No duplicate entries
- ✅ Totals remain consistent

---

### 12. ✅ Bootstrap Timeout (15s)
**Test:**
1. Simulate very slow network (custom throttling: 1kb/s)
2. Refresh page
3. Wait 15+ seconds

**Expected:**
- ✅ See timeout error after 15 seconds
- ✅ Error message: "Bootstrap timed out. Please refresh the page."
- ✅ Retry button works
- ✅ No infinite loading

---

### 13. ✅ Onboarding → Dashboard Transition
**Test:**
1. Complete onboarding as new user
2. Submit final step

**Expected:**
- ✅ See loading screen briefly
- ✅ Land on dashboard with welcome toast
- ✅ Dashboard shows skeleton states
- ✅ Data loads correctly
- ✅ No blank screens

---

### 14. ✅ Network Tab - Parallel Requests
**Test:**
1. Open DevTools → Network tab
2. Clear network log
3. Refresh page while logged in
4. Observe request waterfall

**Expected:**
- ✅ See parallel requests (not sequential)
- ✅ Profile and tax profile fetched together
- ✅ Gigs and payers prefetched in parallel
- ✅ No long waterfall chains

---

### 15. ✅ Error Screen Appearance
**Test:**
1. Force an error (go offline during bootstrap)
2. Observe error screen

**Expected:**
- ✅ Error screen shows "Oops!" title
- ✅ Friendly error message displayed
- ✅ Hint text about network issues
- ✅ "Try Again" button prominent
- ✅ No technical jargon or stack traces

---

## How to Run These Tests

### Quick Test (5 minutes)
Run tests: 1, 2, 4, 7, 9

### Full Test (15 minutes)
Run all 15 tests in order

### Automated (Future)
Consider adding Playwright tests for critical path (tests 1-6)

---

## Pass Criteria

**All 15 tests must pass** before deploying to production.

If any test fails:
1. Document the failure
2. Check console for errors
3. Check Network tab for failed requests
4. Review performance marks
5. Fix and re-test

---

## Performance Targets

- **Bootstrap ready:** < 1000ms
- **Dashboard mounted:** < 1500ms
- **Dashboard interactive:** < 2000ms
- **Time to first skeleton:** < 100ms
- **Skeleton → data:** < 1000ms

---

## Success Indicators

✅ **User never sees a blank screen**
✅ **Clear feedback at every step**
✅ **Errors are recoverable**
✅ **Performance is measurable**
✅ **Load time improved by 50%+**

---

**Status:** Ready for QA testing
**Priority:** Critical - must pass before production
**Estimated Test Time:** 15 minutes (full suite)
