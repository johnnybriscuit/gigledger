# Phase 1: Monetization Plumbing + Free Invoice Limit

## Summary

This PR implements Phase 1 of the monetization infrastructure, establishing reliable plan enforcement across the product with a focus on invoice limits. The implementation ensures both UI and server-side enforcement to prevent bypassing limits through imports or edge flows.

**Key Changes:**
- Centralized entitlements system (single source of truth for plan limits and capabilities)
- Server-side invoice limit enforcement (3 invoices lifetime for Free plan)
- Paywall modals at "moment of pain" for invoice creation and exports
- Stripe plan state reliability improvements after checkout

## Product Decision

**Invoice Limits:**
- **Free plan:** 3 invoices total (lifetime cap, not monthly)
- **Pro plan:** Unlimited invoices

**Other Free Limits (unchanged):**
- Gigs: up to 20
- Expenses: up to 20

## Files Changed

### New Files Created

1. **`src/hooks/useEntitlements.ts`** (164 lines)
   - Centralized entitlements hook
   - Single source of truth for plan limits, usage, and capabilities
   - Returns: plan, isPro, limits, usage, can, remaining
   - Uses React Query with 30s staleTime for performance

2. **`src/components/PaywallModal.tsx`** (210 lines)
   - Reusable paywall modal component
   - Supports multiple paywall reasons: invoice_limit, export_limit, gig_limit, expense_limit
   - Consistent messaging and upgrade CTAs
   - Navigates to SubscriptionScreen on upgrade

3. **`supabase/migrations/20260114_add_invoice_free_limit.sql`** (80 lines)
   - Adds `invoices_created_count` column to profiles table
   - Creates trigger to increment counter on invoice creation (never decrements)
   - Updates RLS policy to enforce 3 invoice limit for Free users
   - Backfills existing invoice counts

### Modified Files

4. **`src/screens/InvoicesScreen.tsx`**
   - Added entitlements hook integration
   - Added paywall modal for invoice creation and exports
   - Shows "X invoices remaining" helper text for Free users
   - Blocks invoice creation when limit reached
   - Blocks exports for Free users
   - Added `onNavigateToSubscription` prop

5. **`src/components/InvoiceForm.tsx`**
   - Added entitlements checking before invoice creation
   - Client-side validation for invoice limit
   - Server-side error handling for RLS policy violations
   - Shows user-friendly error messages when limit reached

6. **`src/screens/DashboardScreen.tsx`**
   - Added `onNavigateToSubscription` handler to InvoicesScreen
   - Enables navigation from paywall to subscription screen

7. **`src/screens/SubscriptionScreen.tsx`**
   - Added automatic subscription refresh on window focus
   - Invalidates entitlements and profile queries after returning from Stripe
   - Ensures Pro users see updated plan immediately

8. **`src/hooks/useSyncSubscription.ts`**
   - Added entitlements query invalidation on subscription sync
   - Ensures fresh plan data after manual sync

9. **`src/lib/queryKeys.ts`**
   - Added `invoices` and `invoice` query keys
   - Supports invoice-related query caching

## Database Changes

### New Column
- `profiles.invoices_created_count` (INTEGER NOT NULL DEFAULT 0)
  - Lifetime count of invoices created
  - Never decrements (even on delete)
  - Used for Free plan enforcement

### New Trigger
- `increment_invoice_counter_trigger` on `invoices` table
  - Fires AFTER INSERT
  - Increments `profiles.invoices_created_count`

### Updated RLS Policy
- Replaced `"Users can insert their own invoices"` policy
- New policy: `"Users can insert their own invoices with limits"`
  - Pro users: unlimited invoices
  - Free users: blocked when `invoices_created_count >= 3`

## Manual QA Checklist

### Free User Tests

- [ ] **Invoice Creation (1-3)**
  - [ ] Create invoice #1 → succeeds
  - [ ] Create invoice #2 → succeeds
  - [ ] Create invoice #3 → succeeds
  - [ ] UI shows "Free: 2 invoices remaining" after invoice #1
  - [ ] UI shows "Free: 1 invoice remaining" after invoice #2
  - [ ] UI shows "Free: 0 invoices remaining" after invoice #3

- [ ] **Invoice Limit Enforcement**
  - [ ] Attempt to create invoice #4 via UI → paywall modal shown
  - [ ] Attempt to create invoice #4 via form → blocked with error message
  - [ ] Server-side: verify RLS policy blocks insert (check Supabase logs)
  - [ ] `profiles.invoices_created_count` = 3 in database

- [ ] **Invoice Deletion**
  - [ ] Delete invoice #3
  - [ ] Attempt to create new invoice → still blocked
  - [ ] `profiles.invoices_created_count` still = 3 (never decrements)

- [ ] **Export Blocking**
  - [ ] Attempt to download invoice → paywall modal shown
  - [ ] Paywall modal shows "Exports are a Pro feature" message

- [ ] **Existing Limits (Regression)**
  - [ ] Gig limit still enforced at 20
  - [ ] Expense limit still enforced at 20
  - [ ] Existing paywall modals still work

### Pro User Tests

- [ ] **Unlimited Invoices**
  - [ ] Create 5+ invoices → all succeed
  - [ ] No paywall prompts shown
  - [ ] No "invoices remaining" text shown

- [ ] **Exports**
  - [ ] Download invoice → succeeds without paywall
  - [ ] Print invoice → succeeds without paywall

- [ ] **Plan State After Upgrade**
  - [ ] Subscribe to Pro via Stripe
  - [ ] Return to app
  - [ ] Subscription screen shows Pro plan (auto-refresh on focus)
  - [ ] Can create invoices immediately (no hard refresh needed)
  - [ ] `profiles.plan` = 'pro_monthly' or 'pro_yearly' in database

### Regression Tests

- [ ] **Navigation**
  - [ ] Desktop web: sidebar navigation works
  - [ ] Mobile web: navigation works
  - [ ] No AppShell/sidebar changes in this PR

- [ ] **Styling**
  - [ ] No CSS `@media` queries in `StyleSheet.create()`
  - [ ] Uses `useWindowDimensions` / `Platform` checks only

- [ ] **Existing Features**
  - [ ] Gigs screen: create, edit, delete works
  - [ ] Expenses screen: create, edit, delete works
  - [ ] Payers screen: create, edit, delete works
  - [ ] Dashboard: loads and displays data

### Edge Cases

- [ ] **New User**
  - [ ] Fresh account has `invoices_created_count` = 0
  - [ ] Can create 3 invoices

- [ ] **Existing User (before migration)**
  - [ ] Migration backfills correct invoice count
  - [ ] If user had 2 invoices, counter = 2
  - [ ] Can create 1 more invoice (total 3)

- [ ] **Downgrade from Pro to Free**
  - [ ] User with 10 invoices downgrades
  - [ ] Cannot create new invoices (counter > 3)
  - [ ] Can still view/edit existing invoices

## Rollback Notes

### If Issues Arise

**Option 1: Rollback Migration (Safest)**
```sql
-- Remove the RLS policy
DROP POLICY IF EXISTS "Users can insert their own invoices with limits" ON invoices;

-- Restore original policy
CREATE POLICY "Users can insert their own invoices"
ON invoices
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Drop trigger
DROP TRIGGER IF EXISTS increment_invoice_counter_trigger ON invoices;

-- Drop function
DROP FUNCTION IF EXISTS increment_invoice_counter();

-- Remove column (optional - can keep for future use)
ALTER TABLE profiles DROP COLUMN IF EXISTS invoices_created_count;
```

**Option 2: Disable Enforcement (Keep Infrastructure)**
```sql
-- Just remove the limit check from RLS policy
DROP POLICY IF EXISTS "Users can insert their own invoices with limits" ON invoices;

CREATE POLICY "Users can insert their own invoices"
ON invoices
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Option 3: Code Rollback**
- Revert commits for this PR
- Migration will remain applied (safe to keep)
- UI will stop showing paywalls
- Server-side enforcement remains (can be disabled with Option 2)

### Rollback Impact

- **Low Risk:** Migration is additive (adds column, trigger, policy)
- **No Data Loss:** Existing invoices unaffected
- **Reversible:** All changes can be undone with SQL
- **Graceful Degradation:** If migration fails, app continues to work (just no enforcement)

## Testing Commands

```bash
# Run migration locally
supabase db reset

# Check migration applied
supabase db diff

# Test RLS policy
# (Use Supabase SQL Editor to test as different users)

# Verify trigger works
INSERT INTO invoices (user_id, ...) VALUES (...);
SELECT invoices_created_count FROM profiles WHERE id = 'user_id';
```

## Performance Considerations

- **Entitlements Hook:** Uses React Query with 30s staleTime to minimize refetches
- **Trigger Performance:** Simple counter increment, minimal overhead
- **RLS Policy:** Uses indexed columns (user_id, plan), fast lookups
- **Query Invalidation:** Only invalidates on subscription changes, not on every action

## Security Notes

- **Server-Side Enforcement:** RLS policy prevents bypassing via direct API calls
- **Trigger Security:** Uses SECURITY DEFINER to ensure proper permissions
- **Client-Side Validation:** Provides good UX but not relied upon for security
- **Counter Integrity:** Lifetime counter prevents gaming the system by deleting invoices

## Known Limitations

1. **Migration Timing:** The `invoices_created_count` column doesn't exist until migration runs. TypeScript errors in `useEntitlements.ts` are expected until migration is applied.

2. **Backfill Accuracy:** Migration backfills based on current invoice count. If invoices were hard-deleted before migration, count may be lower than actual lifetime created.

3. **No Soft Reset:** Counter never decrements. This is intentional to prevent abuse, but means users can't "reset" their Free trial by deleting invoices.

## Next Steps (Future PRs)

- Phase 2: Gig/Expense limit paywalls (reuse PaywallModal component)
- Phase 3: Export limit enforcement (already has UI, needs server-side)
- Phase 4: Analytics on paywall conversion rates
- Phase 5: A/B testing different paywall copy

---

**PR Author:** Phase 1 Implementation  
**Date:** January 14, 2026  
**Reviewers:** @team  
**Related Issues:** Monetization Infrastructure Epic
