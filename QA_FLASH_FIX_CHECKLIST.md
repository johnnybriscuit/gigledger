# QA Checklist: Flash of Incorrect Totals Fix

## Test Environment Setup

### Enable Debug Mode
```javascript
// In browser console:
window.__GL_DEBUG_TOTALS__ = true
```

### Network Throttling
- DevTools → Network → "Fast 3G" or "Slow 3G"

---

## Critical Tests

### ✅ Test 1: Hard Refresh on Dashboard
**Steps:**
1. Navigate to Dashboard
2. Open DevTools Console
3. Enable debug mode: `window.__GL_DEBUG_TOTALS__ = true`
4. Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

**Expected:**
- See skeleton cards while loading
- Only ONE debug log entry with `ready: true` and `notes: 'READY - All data loaded'`
- No log entries with `notes: '⚠️ NOT READY - SHOWING NULL/SKELETON'` rendering actual numbers
- Net profit appears once with correct value (includes expenses)

**Fail Criteria:**
- Multiple log entries with changing net profit values
- Log shows "CALCULATED WITH INCOMPLETE DATA"
- Flash of higher net profit before settling to correct value

---

### ✅ Test 2: Slow Network Load
**Steps:**
1. DevTools → Network → "Slow 3G"
2. Navigate to Dashboard
3. Watch loading sequence

**Expected:**
- Skeleton cards show for 2-5 seconds
- All totals appear simultaneously when ready
- No partial data (income-only) shown
- Debug log shows single "READY" entry

**Fail Criteria:**
- Net profit appears, then changes
- "Set Aside" shows $0 then updates
- Any flash of incorrect numbers

---

### ✅ Test 3: Range Switching
**Steps:**
1. Start on Dashboard with YTD selected
2. Switch to "Last 30 Days"
3. Switch to "Last 90 Days"
4. Watch for flashing

**Expected:**
- Brief skeleton OR previous numbers stay visible
- No flash of incorrect new numbers
- Smooth transition to new totals

**Fail Criteria:**
- Flash of $0 or wrong totals during switch
- Multiple renders with different values

---

### ✅ Test 4: Tab Navigation
**Steps:**
1. Dashboard → Gigs → Expenses → Dashboard
2. Watch totals on each screen

**Expected:**
- Consistent totals across all screens
- No recalculation flash when returning to Dashboard
- Cached data loads instantly

**Fail Criteria:**
- Totals differ between screens
- Flash when navigating back to Dashboard

---

### ✅ Test 5: Logout/Login (Cache Bleed Test)
**Steps:**
1. Log in as User A, note totals
2. Log out
3. Log in as User B
4. Check Dashboard

**Expected:**
- User B sees only their data
- No flash of User A's data
- Clean slate load

**Fail Criteria:**
- Brief flash of User A's totals
- Mixed data from both users

---

## Debug Log Analysis

### Good Log (No Flash)
```
[DebugTotals +850ms] useDashboardData
  ready: true ✓
  userId: "abc123"
  range: ytd
  gigs: success (19)
  expenses: success (12)
  taxProfile: success
  netProfit: $5,840.00
  setAside: $1,200.00
  notes: READY - All data loaded
```

### Bad Log (Flash Detected)
```
[DebugTotals +200ms] useDashboardData
  ready: false ⚠️
  gigs: success (19)
  expenses: loading ⚠️
  netProfit: $0.00
  setAside: $0.00
  notes: ⚠️ NOT READY - SHOWING NULL/SKELETON

[DebugTotals +850ms] useDashboardData
  ready: true
  netProfit: $5,840.00
```

**If you see the "Bad Log" pattern, the fix is NOT working.**

---

## Summary Analysis

Run in console after testing:
```javascript
__debugTotals__.summary()
```

**Expected Output:**
```
✓ No issues detected
```

**Fail Indicators:**
```
⚠️ X calculations ran while data was still loading
⚠️ Net profit changed Y times: $0.00 → $7,040.00 → $5,840.00
```

---

## Success Criteria

- ✅ No numeric totals render until `isReady === true`
- ✅ Skeletons show during loading
- ✅ Debug logs show only ONE calculation per render
- ✅ No "income-only" flash (expenses always included)
- ✅ No cache bleeding between users
- ✅ Consistent behavior across Dashboard/Gigs/Expenses
- ✅ Works on slow network without flashing
- ✅ Range switching doesn't show incorrect numbers

---

## Regression Tests

### Verify No Breakage
- [ ] Dashboard loads correctly
- [ ] Gigs list shows accurate totals
- [ ] Expenses screen works
- [ ] Tax calculations are correct
- [ ] Range filter works
- [ ] Export functionality works
- [ ] Mobile responsive layout intact

---

## Performance Benchmarks

With debug mode enabled, check:
```javascript
perf.getReport()
```

**Target Metrics:**
- Bootstrap ready: < 1000ms
- Dashboard mounted: < 1500ms
- Dashboard interactive: < 2000ms

**Acceptable:**
- Slightly slower due to readiness gate (50-100ms overhead)
- But NO FLASHING of incorrect data

---

## Notes

- Debug logging adds ~10ms overhead per render
- Disable debug mode for production performance testing
- Flash fix prioritizes correctness over speed (acceptable tradeoff)
