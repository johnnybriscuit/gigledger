# Tax Withholding System - Deployment Guide

## 🚀 Quick Start

Follow these steps to deploy the tax withholding system to your GigLedger app.

## Step 1: Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Add the tax configuration variables:
```bash
EXPO_PUBLIC_TAX_YEAR=2025
EXPO_PUBLIC_FEDERAL_FLAT_RATE_SINGLE=0.12
EXPO_PUBLIC_FEDERAL_FLAT_RATE_MARRIED=0.12
EXPO_PUBLIC_FEDERAL_FLAT_RATE_HOH=0.12
EXPO_PUBLIC_USE_FEDERAL_BRACKETS=false
```

## Step 2: Run Database Migration

### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250120_add_tax_withholding_tables.sql`
4. Paste and run the SQL
5. Verify tables were created:
   - `state_tax_rates` table exists
   - `profiles` table has `state_code` and `filing_status` columns

### Option B: Using Supabase CLI
```bash
# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push

# Or apply specific migration
supabase migration up
```

## Step 3: Update Database Types

After running the migration, regenerate TypeScript types:

```bash
# Using Supabase CLI
supabase gen types typescript --project-id your-project-id > src/types/database.types.ts

# Or manually update src/types/database.types.ts to include:
# - profiles.state_code: string | null
# - profiles.filing_status: string | null
# - state_tax_rates table definition
```

## Step 4: Install Dependencies

No new dependencies are required! The system uses existing packages.

## Step 5: Test the Implementation

### A. Test Database Access
```typescript
// In your app, try fetching a state rate
import { getStateRate } from './src/services/taxService';

const rate = await getStateRate('TN', 2025);
console.log('TN Rate:', rate); // Should show flat_rate: 0
```

### B. Test Withholding Calculation
```typescript
import { calculateWithholding } from './src/lib/tax/withholding';

const result = calculateWithholding(
  { amount: 1000, stateCode: 'TN', filingStatus: 'single' },
  { state_code: 'TN', type: 'flat', flat_rate: 0, brackets: null }
);

console.log('Withholding:', result);
// Should show: { federalIncome: 120, selfEmployment: ~141, stateIncome: 0, total: ~261 }
```

### C. Run Unit Tests
```bash
npm test -- withholding.test.ts
# or
yarn test withholding.test.ts
```

## Step 6: Wire Up Onboarding (Optional)

To show the tax info onboarding screen after signup:

### Option A: Add to existing onboarding flow
```typescript
// In your auth/signup flow
import { OnboardingTaxInfo } from './src/screens/OnboardingTaxInfo';

// After successful signup, show:
<OnboardingTaxInfo 
  onComplete={() => {
    // Navigate to dashboard
    navigation.navigate('Dashboard');
  }}
  onSkip={() => {
    // Allow skipping, navigate to dashboard
    navigation.navigate('Dashboard');
  }}
/>
```

### Option B: Add as a settings screen
```typescript
// In your settings/profile screen
import { OnboardingTaxInfo } from './src/screens/OnboardingTaxInfo';

// Add a button to update tax info
<TouchableOpacity onPress={() => navigation.navigate('TaxInfo')}>
  <Text>Update Tax Information</Text>
</TouchableOpacity>
```

## Step 7: Verify Withholding Card

1. Open the app
2. Navigate to "Add New Gig"
3. Enter a gross amount (e.g., $1000)
4. Scroll down - you should see the "💰 Recommended Set-Aside" card
5. Verify it shows:
   - Total amount
   - Federal tax estimate
   - SE tax estimate
   - State tax estimate

### Expected Behavior:
- **Without tax profile**: Shows "Setup Tax Info" button, uses TN (0% state tax) as default
- **With tax profile**: Uses user's actual state rate
- **Live updates**: Card updates as you change the gross amount

## Step 8: Test State-Specific Rates

### Test TN (No State Tax)
1. Set up tax profile with state = TN
2. Create a $1000 gig
3. State tax should be $0.00

### Test CA (Progressive Brackets)
1. Set up tax profile with state = CA
2. Create a $1000 gig
3. State tax should be $10.00 (first bracket: 1%)

### Test MD (Flat Rate)
1. Set up tax profile with state = MD
2. Create a $1000 gig
3. State tax should be $47.50 (4.75% flat rate)

## Step 9: Production Checklist

Before going to production:

- [ ] Replace placeholder state tax rates with actual 2025 rates
- [ ] Verify Social Security wage base is correct for 2025
- [ ] Update federal tax rates if needed
- [ ] Test on both iOS and web
- [ ] Verify RLS policies are working correctly
- [ ] Add analytics tracking for tax profile completion
- [ ] Add error logging for failed calculations
- [ ] Test with various income amounts (low, medium, high)
- [ ] Verify calculations match IRS guidelines

## Troubleshooting

### Issue: "No tax rate found for state"
**Solution**: Check that the migration ran successfully and seeded the `state_tax_rates` table.

```sql
-- Verify data exists
SELECT * FROM state_tax_rates WHERE state_code = 'TN';
```

### Issue: Withholding card not showing
**Solution**: 
1. Check that `grossAmount` > 0
2. Verify `useWithholding` hook is not returning errors
3. Check browser console for errors

### Issue: TypeScript errors about missing types
**Solution**: Regenerate database types after running migration.

### Issue: State tax is wrong
**Solution**: 
1. Verify the state rate in the database
2. Check that user's `state_code` in profiles matches
3. Ensure placeholder rates are clearly marked and will be updated

## Updating State Tax Rates

### For Flat Rate States:
```sql
SELECT update_state_flat_rate('MD', 2025, 0.0475, 'Updated to actual 2025 rate');
```

### For Bracket States:
```sql
UPDATE state_tax_rates
SET brackets = '[
  {"upTo": 10000, "rate": 0.01},
  {"upTo": 50000, "rate": 0.04},
  {"upTo": null, "rate": 0.093}
]'::jsonb,
notes = 'Updated to actual CA 2025 brackets',
updated_at = NOW()
WHERE state_code = 'CA' AND effective_year = 2025;
```

## Monitoring

### Key Metrics to Track:
- Tax profile completion rate
- Withholding calculation errors
- State rate cache hit rate
- User feedback on accuracy

### Logging:
```typescript
// Add to your analytics
analytics.track('tax_profile_completed', {
  state: stateCode,
  filing_status: filingStatus,
});

analytics.track('withholding_calculated', {
  amount: withholdingAmount,
  total_tax: breakdown.total,
  has_profile: hasProfile,
});
```

## Support & Maintenance

### Annual Updates Required:
1. **January**: Update tax year in `.env`
2. **January**: Update federal tax brackets in `constants.ts`
3. **January**: Update Social Security wage base
4. **January**: Insert new year's state rates
5. **Quarterly**: Review and update state rates if changed

### Resources:
- Federal rates: https://www.irs.gov/pub/irs-pdf/p15.pdf
- SS wage base: https://www.ssa.gov/oact/cola/cbb.html
- State rates: Each state's Department of Revenue website

## Next Steps

After deployment:
1. Monitor user feedback on tax estimates
2. Consider adding quarterly payment reminders
3. Implement bracket-based federal tax (currently flat rate)
4. Add support for additional Medicare tax (0.9% over threshold)
5. Consider multi-state income support
6. Add tax form generation (1099, Schedule C)

## Questions?

Refer to `docs/tax-withholding.md` for detailed technical documentation.
