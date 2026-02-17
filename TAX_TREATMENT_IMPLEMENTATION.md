# Tax Treatment Implementation Summary

## Overview
Implemented first-class W-2 vs 1099 tax treatment support to track gigs for income/tours/P&L while excluding W-2 gigs from estimated tax set-aside calculations (since withholding is handled by payroll).

## Database Changes

### Migrations Created
1. **20260217_add_tax_treatment.sql** - Schema additions
2. **20260217_backfill_tax_treatment.sql** - Data migration and backward compatibility

### Payers Table
**New columns:**
- `tax_treatment` TEXT NOT NULL DEFAULT 'contractor_1099'
  - Values: 'w2', 'contractor_1099', 'other'
  - CHECK constraint enforced
- `w2_employer_name` TEXT (nullable)
- `w2_employer_ein_last4` TEXT (nullable, validated as 4 digits)
- `payroll_provider` TEXT (nullable)
- `payroll_contact_email` TEXT (nullable)

**Legacy field:**
- `expect_1099` kept for backward compatibility
- Auto-synced via trigger: `tax_treatment='contractor_1099'` → `expect_1099=true`

### Gigs Table
**New columns:**
- `tax_treatment` TEXT (nullable - NULL means inherit from payer)
  - Values: 'w2', 'contractor_1099', 'other'
  - CHECK constraint enforced
- `amount_type` TEXT NOT NULL DEFAULT 'gross'
  - Values: 'gross', 'net'
- `net_amount_w2` NUMERIC(12,2) (nullable - for W-2 net pay)
- `withholding_amount` NUMERIC(12,2) (nullable - for W-2 withholding)

**Existing fields preserved:**
- `gross_amount` - continues to work for all gigs
- `net_amount` - calculated field (gross + tips + per_diem + other_income - fees)

### Database Functions
- `get_effective_tax_treatment(gig_tax_treatment, payer_tax_treatment)` - Returns effective treatment
- `sync_expect_1099()` - Trigger function to keep legacy field in sync

### Views
- `gigs_with_tax_treatment` - Joins gigs with payers to show effective tax treatment

## Code Changes

### Type Definitions
**Updated:** `src/types/database.types.ts`
- Added tax_treatment fields to Payers Row/Insert/Update types
- Added W-2 fields to Payers types
- Added tax_treatment and amount fields to Gigs types

### Validation Schemas
**Updated:** `src/lib/validations.ts`
- `payerSchema` - Added tax_treatment and W-2 fields
- `gigSchema` - Added tax_treatment, amount_type, net_amount_w2, withholding_amount

### Utility Functions
**New file:** `src/lib/taxTreatment.ts`
- `getEffectiveTaxTreatment(gig, payer)` - Get effective tax treatment
- `shouldExcludeFromTaxSetAside(gig, payer)` - Check if W-2 (excluded)
- `getGigDisplayAmount(gig)` - Get display amount based on treatment
- `getGigTaxBasisAmount(gig, payer)` - Get tax basis (0 for W-2)
- `getTaxTreatmentLabel(treatment)` - Human-readable label
- `getTaxTreatmentShortLabel(treatment)` - Short badge label
- `getDefaultAmountType(treatment)` - Default amount type by treatment

### UI Components

#### PayerFormModal (Updated)
**File:** `src/components/PayerFormModal.tsx`

**New UI elements:**
- Tax Treatment selector (3 buttons: W-2, 1099/Contractor, Other/Mixed)
- Conditional 1099 fields (only show when contractor_1099 selected)
- W-2 Details accordion (only show when w2 selected):
  - Employer Name
  - Employer EIN (last 4)
  - Payroll Provider
  - Payroll Contact Email

**Logic:**
- Initialize from `tax_treatment` field or legacy `expect_1099`
- Only save W-2 fields when `tax_treatment='w2'`
- Only save 1099 fields when `tax_treatment='contractor_1099'`
- Auto-sync `expect_1099` for backward compatibility

### Tax Calculation Updates

#### useGigTaxCalculation Hook
**File:** `src/hooks/useGigTaxCalculation.ts`

**Changes:**
- YTD query now joins with payers table to get tax_treatment
- Excludes W-2 gigs from YTD gross calculation
- Uses effective tax treatment logic: `gig.tax_treatment || payer.tax_treatment`

#### AddGigModal Component
**File:** `src/components/AddGigModal.tsx`

**Changes:**
- YTD query updated to exclude W-2 gigs
- Tax set-aside calculation only applies to contractor gigs

## Backward Compatibility

### Data Migration
- Existing payers: `expect_1099=true` → `tax_treatment='contractor_1099'`
- Existing payers: `expect_1099=false` → `tax_treatment='other'`
- Existing gigs: inherit `tax_treatment` from their payer
- Existing gigs: `amount_type` set based on effective treatment

### Legacy Field Support
- `expect_1099` field maintained and auto-synced
- Existing code reading `expect_1099` continues to work
- Trigger ensures `expect_1099` stays in sync with `tax_treatment`

### Display Amount Logic
- Existing gigs use `gross_amount` (unchanged)
- New W-2 gigs can use `net_amount_w2`
- Fallback chain: `net_amount_w2` → `gross_amount` → `net_amount`

## Tax Set-Aside Behavior

### Before (All Gigs)
```
YTD Gross = Sum of all gigs (gross + tips + per_diem + other_income - fees)
Tax Set-Aside = Calculated on all income
```

### After (Excludes W-2)
```
YTD Gross = Sum of contractor_1099 and other gigs only
Tax Set-Aside = Calculated on contractor income only
W-2 Income = Tracked separately, excluded from set-aside
```

### Rationale
W-2 gigs have taxes withheld by employer, so no estimated tax set-aside needed.

## Testing Checklist

### Database
- [ ] Run migration `20260217_add_tax_treatment.sql`
- [ ] Run migration `20260217_backfill_tax_treatment.sql`
- [ ] Verify payers table has new columns
- [ ] Verify gigs table has new columns
- [ ] Verify CHECK constraints work
- [ ] Verify trigger syncs expect_1099

### Payer CRUD
- [ ] Create new payer with W-2 treatment
- [ ] Create new payer with 1099 treatment
- [ ] Edit existing payer to change treatment
- [ ] Verify W-2 fields only save when W-2 selected
- [ ] Verify 1099 fields only save when 1099 selected
- [ ] Verify expect_1099 auto-syncs

### Gig Creation
- [ ] Create gig with W-2 payer
- [ ] Verify tax treatment badge shows "W-2"
- [ ] Verify tax set-aside is $0 or excluded
- [ ] Create gig with 1099 payer
- [ ] Verify tax set-aside calculates normally

### Tax Calculations
- [ ] Dashboard shows correct YTD totals
- [ ] W-2 gigs excluded from tax set-aside
- [ ] 1099 gigs included in tax set-aside
- [ ] Tax breakdown shows correct amounts

### Backward Compatibility
- [ ] Existing payers load correctly
- [ ] Existing gigs load correctly
- [ ] Legacy expect_1099 field still works
- [ ] No data loss on existing records

## Next Steps (Not Implemented Yet)

### Gig Form UI
- Add tax treatment badge/display when payer selected
- Add optional tax treatment override toggle
- Add W-2 amount fields (net, gross, withholding)
- Conditional UX based on effective treatment

### Dashboard Enhancements
- Add W-2 vs 1099 income breakdown card
- Show "Total Income" vs "1099 Income" vs "W-2 Income"
- Update charts to distinguish income types

### Exports
- Update CSV exports to include tax_treatment
- Update Schedule C exports to exclude W-2 income
- Add W-2 income summary report

### Tours/Runs
- Update tour P&L to use correct display amounts
- Show W-2 vs 1099 breakdown in tour summaries

## Files Modified

### Database
- `supabase/migrations/20260217_add_tax_treatment.sql` (new)
- `supabase/migrations/20260217_backfill_tax_treatment.sql` (new)

### Types & Validation
- `src/types/database.types.ts` (modified)
- `src/lib/validations.ts` (modified)
- `src/lib/taxTreatment.ts` (new)

### Components
- `src/components/PayerFormModal.tsx` (modified)

### Hooks
- `src/hooks/useGigTaxCalculation.ts` (modified)
- `src/components/AddGigModal.tsx` (modified)

## Configuration
No environment variables or config changes required.

## Deployment Notes
1. Run database migrations in order
2. Deploy updated code
3. Verify backward compatibility with existing data
4. Test payer and gig CRUD operations
5. Verify tax calculations exclude W-2 gigs
