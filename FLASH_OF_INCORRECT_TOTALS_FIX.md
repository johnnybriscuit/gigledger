# Flash of Incorrect Totals - Fix Implementation

## Problem Statement

The dashboard briefly shows incorrect net profit and tax totals on initial load, then updates to the correct values. This creates a confusing "flash" where users see higher net profit (without taxes) before the correct value appears.

## Root Causes Identified

### 1. **Calculations Run Before Tax Profile Loads**
- `useDashboardData` calculates totals immediately when gigs data arrives
- Tax profile may still be loading, causing `useTaxCalculation` to return `null` or default values
- Result: Dashboard shows net profit without tax deductions

### 2. **Missing Loading State Coordination**
- Individual hooks (`useGigs`, `useExpenses`, `useTaxProfile`) track their own loading states
- No centralized "ready" state that ensures ALL required data is loaded
- Components render with partial data

### 3. **Query Keys Don't Include Range**
- Current: `['gigs', userId]`
- Should be: `['gigs', userId, range]`
- This causes cached data from different ranges to briefly show

### 4. **Business Structure Defaults**
- `business_structure` defaults to `'individual'` while profile loads
- Tax calculations may use wrong structure initially

### 5. **React Query Behavior**
- `keepPreviousData` or stale cache can show old values briefly
- No explicit check for "all dependencies ready" before rendering totals

## Solution Architecture

### 1. Debug Instrumentation (Dev-Only)

**File:** `src/lib/debugTotals.ts`

```typescript
// Enable in browser console:
window.__GL_DEBUG_TOTALS__ = true

// Logs every totals calculation with:
// - Data status (loading/success/error)
// - Query counts and date ranges
// - Tax profile fields
// - Computed outputs
// - Timestamps for render sequence
```

### 2. Centralized Totals Hook

**File:** `src/hooks/useTotals.ts` (NEW)

```typescript
interface TotalsResult {
  status: 'loading' | 'ready' | 'error';
  data: {
    netProfit: number;
    taxes: number;
    effectiveTaxRate: number;
    // ... other totals
  } | null;
}

export function useTotals(range: DateRange): TotalsResult {
  // Check ALL dependencies
  const gigsQuery = useGigs();
  const expensesQuery = useExpenses();
  const taxProfileQuery = useTaxProfile();
  const profileQuery = useProfile();
  
  // Only return 'ready' when ALL are successful
  const allReady = 
    gigsQuery.isSuccess &&
    expensesQuery.isSuccess &&
    taxProfileQuery.isSuccess &&
    profileQuery.isSuccess;
  
  if (!allReady) {
    return { status: 'loading', data: null };
  }
  
  // Calculate totals with guaranteed complete data
  // ...
  
  return { status: 'ready', data: totals };
}
```

### 3. Updated Query Keys

**Before:**
```typescript
queryKey: ['gigs', userId]
```

**After:**
```typescript
queryKey: ['gigs', userId, range]
```

This prevents cache bleeding between different date ranges.

### 4. Widget Loading States

**Dashboard widgets:**
```typescript
const totals = useTotals(range);

if (totals.status === 'loading') {
  return <SkeletonDashboardCard />;
}

// Only render real numbers when status === 'ready'
return <Card>{totals.data.netProfit}</Card>;
```

### 5. No Fallback Tax Rates

**Before:**
```typescript
const taxRate = taxProfile?.rate || 0; // ❌ Shows $0 taxes
```

**After:**
```typescript
if (!taxProfile) {
  return { status: 'loading', data: null }; // ✅ Shows skeleton
}
const taxRate = taxProfile.rate;
```

## Implementation Plan

### Phase 1: Debug & Identify (CURRENT)
- [x] Create `debugTotals.ts` logger
- [x] Add logging to `useDashboardData`
- [ ] Add logging to `GigsScreen` totals
- [ ] Add logging to `ExpensesScreen` totals
- [ ] Reproduce issue with slow network
- [ ] Confirm root cause from logs

### Phase 2: Fix Query Keys
- [ ] Update `useGigs` to include range in query key
- [ ] Update `useExpenses` to include range in query key
- [ ] Update `useMileage` to include range in query key
- [ ] Ensure all keys include `userId`

### Phase 3: Create useTotals Hook
- [ ] Create `src/hooks/useTotals.ts`
- [ ] Implement loading state coordination
- [ ] Add debug logging
- [ ] Export typed interface

### Phase 4: Update Components
- [ ] Update `EnhancedDashboard` to use `useTotals`
- [ ] Update `HeroNetProfit` to show skeleton when loading
- [ ] Update `TaxSummaryCard` to show skeleton when loading
- [ ] Update `GigsScreen` header totals
- [ ] Update `ExpensesScreen` header totals

### Phase 5: Testing
- [ ] Test with slow network (Fast 3G)
- [ ] Test range switching
- [ ] Test hard refresh
- [ ] Test logout/login
- [ ] Verify no flash with debug logs

### Phase 6: Cleanup & Deploy
- [ ] Remove or comment out debug logs (keep infrastructure)
- [ ] Create QA checklist
- [ ] Deploy to Vercel
- [ ] Verify in production

## Testing Checklist

### Reproduction Steps
1. **Hard Refresh on Dashboard**
   - Open DevTools Console
   - Enable: `window.__GL_DEBUG_TOTALS__ = true`
   - Hard refresh (Cmd+Shift+R)
   - Watch for multiple log entries with changing totals
   - **Expected:** Only ONE log entry when status === 'ready'

2. **Slow Network**
   - DevTools → Network → "Fast 3G"
   - Refresh page
   - Watch dashboard load
   - **Expected:** Skeletons until all data ready, then real numbers

3. **Range Switching**
   - Switch from YTD → Last 30 Days
   - **Expected:** Brief skeleton OR "Updating..." indicator
   - **NOT expected:** Flash of incorrect numbers

4. **Navigate Between Tabs**
   - Dashboard → Gigs → Expenses → Dashboard
   - **Expected:** Consistent totals, no flashing

5. **Logout/Login**
   - Log out
   - Log in as different user
   - **Expected:** No cached data from previous user

### Debug Log Analysis

**Good (No Flash):**
```
[DebugTotals +850ms] useDashboardData
  ready: true
  gigs: success (19)
  taxProfile: success
  netProfit: $5,840.00
  setAside: $1,200.00
```

**Bad (Flash Detected):**
```
[DebugTotals +200ms] useDashboardData
  ready: false  ⚠️
  gigs: success (19)
  taxProfile: loading  ⚠️
  netProfit: $7,040.00  ⚠️ (no taxes deducted)
  setAside: $0.00  ⚠️
  notes: CALCULATED WITH INCOMPLETE DATA

[DebugTotals +850ms] useDashboardData
  ready: true
  gigs: success (19)
  taxProfile: success
  netProfit: $5,840.00  ✓ (correct)
  setAside: $1,200.00  ✓
```

## Success Criteria

- ✅ No numeric totals render until `status === 'ready'`
- ✅ Skeletons show during loading
- ✅ Debug logs show only ONE calculation per render
- ✅ Query keys include `userId` + `range`
- ✅ No cache bleeding between users or ranges
- ✅ Consistent behavior across Dashboard/Gigs/Expenses
- ✅ Works on slow network without flashing
- ✅ Range switching doesn't show incorrect numbers

## Files Modified

### New Files
- `src/lib/debugTotals.ts` - Debug instrumentation
- `src/hooks/useTotals.ts` - Centralized totals with loading states

### Modified Files
- `src/hooks/useDashboardData.ts` - Add debug logging, fix loading states
- `src/hooks/useGigs.ts` - Update query key to include range
- `src/hooks/useExpenses.ts` - Update query key to include range
- `src/hooks/useMileage.ts` - Update query key to include range
- `src/components/dashboard/EnhancedDashboard.tsx` - Use useTotals, show skeletons
- `src/components/dashboard/HeroNetProfit.tsx` - Show skeleton when loading
- `src/components/dashboard/TaxSummaryCard.tsx` - Show skeleton when loading
- `src/screens/GigsScreen.tsx` - Add debug logging, fix header totals
- `src/screens/ExpensesScreen.tsx` - Add debug logging, fix header totals

## Timeline

- **Phase 1 (Debug):** 30 minutes
- **Phase 2 (Query Keys):** 30 minutes
- **Phase 3 (useTotals Hook):** 1 hour
- **Phase 4 (Components):** 1 hour
- **Phase 5 (Testing):** 30 minutes
- **Phase 6 (Deploy):** 15 minutes

**Total:** ~3.5 hours

## Next Steps

1. Continue adding debug logging to GigsScreen and ExpensesScreen
2. Reproduce issue with slow network throttling
3. Analyze debug logs to confirm root cause
4. Implement useTotals hook
5. Update all components to use new hook
6. Test thoroughly
7. Deploy to Vercel

---

**Status:** Phase 1 in progress (Debug instrumentation created, useDashboardData logging added)
