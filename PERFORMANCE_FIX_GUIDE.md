# Performance Optimization - Remaining Fixes Guide

## Current Status: 105 requests (down from 225) ✓ Progress!

You're seeing improvement but still have ~20 duplicate user queries. Here's exactly what needs to be fixed.

---

## ✅ Completed Fixes

1. **Database Indexes** - Migration created and run ✓
2. **React Query Caching** - 5 min staleTime configured ✓
3. **UserContext** - Created and integrated into DashboardScreen ✓
4. **BusinessStructureWizard** - Updated to use UserContext ✓

---

## 🔧 Remaining Fixes (3 Components + 5 Hooks)

### Fix #1: TaxSettingsSection.tsx

**Location:** Line 104

**Find:**
```typescript
const { data: user } = useQuery({
  queryKey: ['user'],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
});
```

**Replace with:**
```typescript
import { useUser } from '../contexts/UserContext';

// In component:
const { userId } = useUser();
```

**Then update any `user?.id` references to `userId`**

---

### Fix #2: useTaxCalculation.ts Hook

**Location:** Line 42

**Find:**
```typescript
const { data: user } = useQuery({
  queryKey: ['user'],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
});
```

**Replace with:**
```typescript
// This hook should accept userId as a parameter instead
export function useTaxCalculation(netProfit: number, totalIncome: number, userId?: string) {
  // Remove the useQuery(['user']) call
  // Use the userId parameter instead
}
```

**Update components calling this hook:**
```typescript
import { useUser } from '../contexts/UserContext';

function MyComponent() {
  const { userId } = useUser();
  const { taxResult } = useTaxCalculation(netProfit, totalIncome, userId);
}
```

---

### Fix #3: AddGigModal.tsx (Complex - Multiple Changes)

**Location:** Lines 137-143

This file has multiple issues:
1. Fetches user with useQuery
2. Fetches profile separately
3. Fetches taxProfile separately
4. Uses supabase in multiple places

**Simplified approach:**

```typescript
// At top of file, add import:
import { useUser } from '../contexts/UserContext';

// Replace these lines (around 137-146):
const { data: user } = useQuery({...});
const { data: profile } = useProfile(user?.id);
const { data: taxProfile } = useTaxProfile();

// With this:
const { userId, profile, taxProfile } = useUser();

// Then search for all uses of 'user?.id' and replace with 'userId'
// Search for 'user &&' and replace with 'userId &&'
```

**Note:** This file also has YTD data query that calls supabase.auth.getUser() around line 181. That needs the same fix.

---

## 🎯 Critical: Fix Data Hooks (Biggest Impact)

These 5 hooks are making duplicate auth calls in their queryFn. This is causing most of the duplicate requests.

### Pattern to Fix in ALL These Hooks:

**Files:**
- `src/hooks/useGigs.ts`
- `src/hooks/useExpenses.ts`
- `src/hooks/usePayers.ts`
- `src/hooks/useMileage.ts`
- `src/hooks/useTaxProfile.ts`

**Current (BAD) Pattern:**
```typescript
export function useGigs() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);
  
  return useQuery({
    queryKey: userId ? queryKeys.gigs(userId) : ['gigs-loading'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser(); // ❌ DUPLICATE!
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('gigs')
        .select('*')
        .eq('user_id', user.id);
      
      return data;
    },
  });
}
```

**Fixed (GOOD) Pattern:**
```typescript
export function useGigs() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);
  
  return useQuery({
    queryKey: userId ? queryKeys.gigs(userId) : ['gigs-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated'); // ✓ Use userId from state
      
      const { data, error } = await supabase
        .from('gigs')
        .select('*')
        .eq('user_id', userId); // ✓ Use userId from state
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId, // ✓ Only run query when userId exists
  });
}
```

**Key Changes:**
1. Remove `supabase.auth.getUser()` call inside queryFn
2. Use `userId` from the state that's already set in useEffect
3. Add `enabled: !!userId` to prevent query from running before userId is set

**Apply this pattern to all 5 hooks listed above.**

---

## 📊 Expected Results After All Fixes

| Metric | Current | After Fixes |
|--------|---------|-------------|
| **Cold Load** | 105 requests | 15-20 requests |
| **Load Time** | 6.1 seconds | < 2 seconds |
| **User Queries** | ~20 | 1 |
| **Tax Profile Queries** | ~6 | 1 |
| **Navigation Back** | Many requests | 0-5 requests (cached) |

---

## 🧪 Testing After Each Fix

After fixing each component/hook:

1. **Hard refresh** (Cmd+Shift+R)
2. **Check Network tab** - count requests
3. **Navigate Dashboard → Gigs → Dashboard**
4. **Check Network tab** - should see fewer requests on return

---

## 🚨 Priority Order

Do these in order for maximum impact:

1. **Fix 5 data hooks** (useGigs, useExpenses, etc.) - Eliminates ~15 duplicate auth calls
2. **Fix TaxSettingsSection** - Eliminates 1 duplicate user query
3. **Fix useTaxCalculation** - Eliminates 1 duplicate user query  
4. **Fix AddGigModal** - Eliminates 2-3 duplicate queries

After completing all fixes, you should see:
- **First load:** ~15-20 requests
- **Navigation back:** 0-5 requests (from cache)
- **Load time:** < 2 seconds

---

## 💡 Quick Reference: Import Pattern

For any component that needs user data:

```typescript
import { useUser } from '../contexts/UserContext';

function MyComponent() {
  const { userId, user, profile, taxProfile } = useUser();
  
  // userId: string | null - just the ID
  // user: { id, email } | null - basic user info
  // profile: { full_name, business_structure, plan } | null
  // taxProfile: TaxProfile | null - tax settings
}
```

---

## 🔍 How to Find Remaining Issues

Search your codebase for these patterns:

```bash
# Find components still using old user query
grep -r "useQuery.*\['user'\]" src/

# Find hooks calling supabase.auth.getUser in queryFn
grep -r "supabase.auth.getUser" src/hooks/

# Find any remaining supabase auth calls
grep -r "await supabase.auth.getUser" src/
```

Each result is a potential duplicate query that should be fixed.

---

## ✅ Verification Checklist

After all fixes:

- [ ] No `useQuery({ queryKey: ['user'] })` in any component
- [ ] No `supabase.auth.getUser()` inside any queryFn
- [ ] All components use `useUser()` hook for user data
- [ ] Network tab shows ~15-20 requests on cold load
- [ ] Network tab shows 0-5 requests on navigation back
- [ ] Load time < 2 seconds

---

## 🆘 If You Get Stuck

The pattern is always the same:

**Before:**
```typescript
const { data: user } = useQuery(['user'], () => supabase.auth.getUser());
```

**After:**
```typescript
const { userId } = useUser();
```

**Before (in hooks):**
```typescript
queryFn: async () => {
  const { data: { user } } = await supabase.auth.getUser();
  // use user.id
}
```

**After (in hooks):**
```typescript
queryFn: async () => {
  if (!userId) throw new Error('Not authenticated');
  // use userId directly
}
```

Every fix follows this pattern. You're eliminating duplicate auth calls by using the shared UserContext.
