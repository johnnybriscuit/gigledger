# Tiered Pricing Implementation Guide

## Overview
Implementing Free (20 gig limit) and Pro (unlimited) plans with export gating.

## ✅ Part 1: Completed

### 1. Database Schema
- **Migration**: `20241110_add_plan_to_profiles.sql`
  - Added `plan` column to profiles table
  - Type: `user_plan` enum ('free', 'pro_monthly', 'pro_yearly')
  - Default: 'free'
  - **ACTION REQUIRED**: Run this migration in Supabase SQL Editor

### 2. Configuration
- **File**: `src/config/plans.ts`
  - `FREE_GIG_LIMIT = 20`
  - Helper functions: `isPro()`, `canExport()`, `getGigLimit()`
  - Plan features configuration

### 3. Database Types
- **File**: `src/types/database.types.ts`
  - Added `profiles` table with `plan` field
  - Added `user_plan` enum type
  - **Note**: TypeScript errors will resolve after migration is run

### 4. Backend Gating
- **File**: `src/hooks/useGigs.ts`
  - Added gig limit check in `useCreateGig()`
  - Throws error with code `'FREE_PLAN_LIMIT_REACHED'`

- **File**: `src/services/gigService.ts`
  - Added gig limit check in `createGigWithLines()`
  - Checks plan and count before creating gig

### 5. UI Components
- **File**: `src/components/UpgradeModal.tsx`
  - Reusable modal for upgrade prompts
  - Props: title, message, onUpgrade, onClose
  - Clean, musician-friendly design

## ⏳ Part 2: TODO

### 6. Wire Up Upgrade Modal in AddGigModal
**File**: `src/components/AddGigModal.tsx`

Add state:
```typescript
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
```

Update error handling in `handleSubmit`:
```typescript
} catch (error: any) {
  if (error.code === 'FREE_PLAN_LIMIT_REACHED') {
    setShowUpgradeModal(true);
    return;
  }
  // ... existing error handling
}
```

Add modal before closing `</Modal>`:
```tsx
<UpgradeModal
  visible={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  onUpgrade={() => {
    setShowUpgradeModal(false);
    onClose();
    onNavigateToSubscription?.();
  }}
  title="Free plan limit reached"
  message="You can track up to 20 gigs on the free plan. Upgrade to keep logging shows and unlock exports & advanced tax tools."
/>
```

### 7. Update DashboardScreen to Pass Navigation
**File**: `src/screens/DashboardScreen.tsx`

Update AddGigModal call:
```tsx
<AddGigModal
  visible={showAddGigModal}
  onClose={() => setShowAddGigModal(false)}
  onNavigateToSubscription={() => {
    setShowAddGigModal(false);
    setActiveTab('subscription');
  }}
/>
```

### 8. Add Usage Indicator to GigsScreen
**File**: `src/screens/GigsScreen.tsx`

Add at top of gig list (for free users):
```tsx
{plan === 'free' && (
  <View style={styles.usageIndicator}>
    <View style={styles.usageHeader}>
      <Text style={styles.usageText}>
        You've used {gigCount} of {FREE_GIG_LIMIT} gigs on the free plan
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
        <Text style={styles.upgradeLink}>Upgrade</Text>
      </TouchableOpacity>
    </View>
    <View style={styles.progressBar}>
      <View 
        style={[
          styles.progressFill, 
          { width: `${(gigCount / FREE_GIG_LIMIT) * 100}%` }
        ]} 
      />
    </View>
  </View>
)}
```

Styles:
```typescript
usageIndicator: {
  backgroundColor: '#fffbeb',
  borderRadius: 8,
  padding: 12,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#fbbf24',
},
usageHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
usageText: {
  fontSize: 13,
  color: '#92400e',
  flex: 1,
},
upgradeLink: {
  fontSize: 13,
  color: '#3b82f6',
  fontWeight: '600',
},
progressBar: {
  height: 4,
  backgroundColor: '#fef3c7',
  borderRadius: 2,
  overflow: 'hidden',
},
progressFill: {
  height: '100%',
  backgroundColor: '#fbbf24',
},
```

### 9. Update SubscriptionScreen to Show Active Plan
**File**: `src/screens/SubscriptionScreen.tsx`

Fetch user's plan:
```typescript
const { data: profile } = useQuery({
  queryKey: ['profile'],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();
    return data;
  },
});

const currentPlan = profile?.plan || 'free';
```

Update plan selection logic:
```typescript
const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(
  currentPlan === 'pro_yearly' ? 'yearly' : 'monthly'
);
```

Show active plan indicator:
```tsx
{currentPlan !== 'free' && (
  <View style={styles.activePlanBanner}>
    <Text style={styles.activePlanText}>
      ✓ You're on the {currentPlan === 'pro_monthly' ? 'Monthly' : 'Yearly'} plan
    </Text>
  </View>
)}
```

### 10. Implement Pro-Gated Exports
**File**: `src/screens/ExportsScreen.tsx`

Add at top:
```typescript
import { canExport } from '../config/plans';
import { UpgradeModal } from '../components/UpgradeModal';

const [showUpgradeModal, setShowUpgradeModal] = useState(false);

const { data: profile } = useQuery({
  queryKey: ['profile'],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();
    return data;
  },
});

const userPlan = profile?.plan || 'free';
```

Wrap each export button:
```tsx
const handleExport = (type: 'gigs' | 'expenses' | 'mileage' | 'tax') => {
  if (!canExport(userPlan)) {
    setShowUpgradeModal(true);
    return;
  }
  // ... existing export logic
};
```

Add helper text:
```tsx
<Text style={styles.exportHelper}>
  These exports are formatted so you or your CPA can easily use them in tools like TurboTax. Always review for accuracy.
</Text>
```

Add upgrade modal:
```tsx
<UpgradeModal
  visible={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  onUpgrade={() => {
    setShowUpgradeModal(false);
    navigation.navigate('Subscription');
  }}
  title="Exports are a Pro feature"
  message="Upgrade to Pro to export your gigs, expenses, mileage, and tax summaries in formats ready for tax prep tools."
/>
```

### 11. Update Stripe Webhook to Set Plan
**File**: `api/stripe-webhook.ts`

In `handleSubscriptionUpdate`:
```typescript
// Determine plan based on price ID
let plan: 'free' | 'pro_monthly' | 'pro_yearly' = 'free';
if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) {
  plan = 'pro_monthly';
} else if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) {
  plan = 'pro_yearly';
}

// Update user's plan in profiles
await supabaseAdmin
  .from('profiles')
  .update({ plan })
  .eq('id', userId);
```

In `handleSubscriptionDeleted`:
```typescript
// Reset to free plan
await supabaseAdmin
  .from('profiles')
  .update({ plan: 'free' })
  .eq('id', userId);
```

## Testing Checklist

### Free User Flow
- [ ] New user defaults to 'free' plan
- [ ] Can create up to 20 gigs
- [ ] On 21st gig, sees upgrade modal
- [ ] Cannot export (sees upgrade modal)
- [ ] Usage indicator shows correct count

### Pro User Flow
- [ ] After subscribing, plan updates to 'pro_monthly' or 'pro_yearly'
- [ ] Can create unlimited gigs
- [ ] Can export all data types
- [ ] No usage indicator shown
- [ ] Subscription page shows active plan

### Upgrade Flow
- [ ] Clicking "Upgrade Now" navigates to Subscription page
- [ ] Monthly plan selected by default
- [ ] Can switch to Yearly plan
- [ ] After Stripe checkout, plan updates correctly
- [ ] Webhook updates plan in database

## Migration Steps

1. **Run Database Migration**:
   - Open Supabase SQL Editor
   - Run `20241110_add_plan_to_profiles.sql`
   - Verify all existing users have `plan = 'free'`

2. **Deploy Code Changes**:
   - Complete Part 2 implementations above
   - Test locally first
   - Deploy to production

3. **Update Stripe Webhook**:
   - Deploy webhook changes
   - Test with Stripe CLI: `stripe trigger payment_intent.succeeded`
   - Verify plan updates in database

4. **Monitor**:
   - Watch for errors in Sentry/logs
   - Check that free users hit limits correctly
   - Verify exports are gated properly

## Notes

- All messaging is musician-friendly and simple
- Limits enforced both in UI (UX) and backend (security)
- Existing subscription logic preserved and extended
- TypeScript errors will resolve after migration is run
- Plan updates happen via Stripe webhooks for security
