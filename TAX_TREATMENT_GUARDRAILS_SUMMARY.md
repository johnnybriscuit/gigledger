# Tax Treatment Guardrails & Verification - Implementation Summary

## Overview

This document summarizes the comprehensive verification and guardrail layer implemented to ensure W-2 vs 1099 tax treatment is handled correctly across all calculations, UI displays, and export formats.

**Critical Requirement:** W-2 gigs must NEVER appear in Schedule C / self-employment calculations, but should still be tracked for total income and P&L purposes.

---

## What Was Implemented

### 1. Enhanced Tax Treatment Helpers (`src/lib/taxTreatment.ts`)

**New Functions Added:**
- `isW2(treatment)` - Type guard for W-2 identification
- `is1099(treatment)` - Type guard for 1099 identification  
- `shouldIncludeInScheduleC(treatment)` - Returns true ONLY for contractor_1099
- `filterGigsForScheduleC(gigs, payers)` - **Single source of truth** for Schedule C filtering
- `splitGigsByTaxTreatment(gigs, payers)` - Splits gigs into w2/contractor_1099/other arrays
- `calculateIncomeBySplit(gigs, payers)` - Returns income breakdown by tax treatment

**Key Principle:** All Schedule C filtering MUST use `filterGigsForScheduleC()` - this is the canonical filter that ensures only contractor_1099 gigs are included.

### 2. Golden Test Dataset (`src/lib/__tests__/fixtures/taxTreatmentGoldenDataset.ts`)

**Test Data:**
- Payer A: W-2 employer
- Payer B: 1099 contractor
- Gig 1: W-2 gig - $1,000
- Gig 2: 1099 gig - $1,000
- Gig 3: 1099 gig - $500
- Expense: $300

**Expected Outcomes:**
- Total Income: $2,500
- W-2 Income: $1,000 (excluded from Schedule C)
- 1099 Income: $1,500 (included in Schedule C)
- Schedule C Net: $1,200 ($1,500 - $300)
- Tax Set-Aside Basis: $1,200

**Validation Function:** `validateGoldenDataset()` ensures dataset maintains expected invariants.

### 3. Unit Tests (`src/lib/__tests__/taxTreatment.test.ts`)

**Test Coverage:**
- Golden dataset validation
- Effective tax treatment logic (inheritance, overrides)
- Type guards (isW2, is1099, shouldIncludeInScheduleC)
- Tax set-aside exclusion logic
- Schedule C filtering (CRITICAL tests)
- Gig splitting by tax treatment
- Income calculation by split

**Critical Invariants Tested:**
- ✅ Schedule C filter returns only contractor_1099 gigs
- ✅ W-2 gigs never appear in Schedule C filter
- ✅ Adding/removing W-2 gigs does not change Schedule C totals
- ✅ Income calculations match golden dataset expectations

### 4. Verification Documentation (`TAX_TREATMENT_VERIFICATION.md`)

**Contents:**
- Golden dataset expected values
- Critical invariants
- Database verification queries (SQL)
- UI verification steps
- Export verification checklist
- Manual testing procedure
- Common issues and fixes
- Regression testing guide

**Key SQL Queries:**
- Total income by tax treatment
- Schedule C income (1099 only)
- W-2 income (excluded from Schedule C)
- Verify no W-2 leakage
- Tax set-aside basis calculation
- Gig count by treatment

### 5. Export Verification Script (`scripts/verify-tax-treatment-exports.ts`)

**What It Does:**
- Loads golden dataset
- Tests filtering functions
- Tests split functions
- Tests income calculations
- Tests Schedule C calculations
- Tests critical invariants
- Provides pass/fail summary

**Usage:**
```bash
npm run verify:tax-treatment
```

**Exit Codes:**
- 0: All tests passed
- 1: One or more tests failed

### 6. Test Infrastructure

**Added Dependencies:**
- `vitest` - Modern test runner
- `@vitest/ui` - Test UI
- `tsx` - TypeScript execution

**New Scripts:**
```json
{
  "test": "vitest",
  "test:watch": "vitest --watch",
  "test:coverage": "vitest --coverage",
  "test:ui": "vitest --ui",
  "verify:tax-treatment": "tsx scripts/verify-tax-treatment-exports.ts"
}
```

**Config:** `vitest.config.ts` - Vitest configuration

---

## How to Use

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tax treatment verification
npm run verify:tax-treatment
```

### Verifying Correctness

1. **Run Unit Tests:**
   ```bash
   npm test
   ```
   All tests should pass, especially the "CRITICAL" tests.

2. **Run Verification Script:**
   ```bash
   npm run verify:tax-treatment
   ```
   Should output: ✅ VERIFICATION PASSED

3. **Run SQL Queries:**
   - Open `TAX_TREATMENT_VERIFICATION.md`
   - Execute SQL queries in Supabase SQL Editor
   - Compare results to expected values

4. **Manual Testing:**
   - Create golden dataset in app (see verification doc)
   - Verify dashboard totals
   - Generate exports
   - Verify Schedule C contains only 1099 gigs

### Using in Code

**Filtering gigs for Schedule C exports:**
```typescript
import { filterGigsForScheduleC } from '../lib/taxTreatment';

// Create payer map
const payerMap = new Map(payers.map(p => [p.id, p]));

// Filter to only 1099 gigs (excludes W-2 and other)
const scheduleCGigs = filterGigsForScheduleC(gigs, payerMap);

// Use scheduleCGigs for Schedule C calculations
```

**Splitting gigs by tax treatment:**
```typescript
import { splitGigsByTaxTreatment } from '../lib/taxTreatment';

const split = splitGigsByTaxTreatment(gigs, payerMap);

// split.w2 - W-2 gigs (for W-2 summary export)
// split.contractor_1099 - 1099 gigs (for Schedule C)
// split.other - Other gigs
```

**Calculating income breakdown:**
```typescript
import { calculateIncomeBySplit } from '../lib/taxTreatment';

const income = calculateIncomeBySplit(gigs, payerMap);

// income.total - All income
// income.w2 - W-2 income (excluded from Schedule C)
// income.contractor_1099 - 1099 income (included in Schedule C)
// income.other - Other income
```

---

## Export Requirements

### Schedule C Exports (CRITICAL)

**These exports MUST use `filterGigsForScheduleC()`:**
- TurboTax Online Manual Entry Pack
- TurboTax Desktop (TXF)
- H&R Block Desktop (TXF)
- TaxAct Tax Prep Pack
- CSV Bundle - ScheduleC_Summary.csv
- Excel - Schedule C sheet
- PDF Summary - Schedule C section

**Implementation Pattern:**
```typescript
// CORRECT ✅
const scheduleCGigs = filterGigsForScheduleC(allGigs, payerMap);
const scheduleCIncome = scheduleCGigs.reduce((sum, g) => sum + g.gross_amount, 0);

// INCORRECT ❌ - includes W-2 gigs
const scheduleCIncome = allGigs.reduce((sum, g) => sum + g.gross_amount, 0);
```

### W-2 Summary Exports

**W-2 gigs should appear in separate files:**
- `W2_Income_Summary.csv` - Separate W-2 tracking file
- Excel - Separate "W-2 Gigs" sheet
- PDF - Separate "W-2 Tracked Income (Informational)" section

**Implementation Pattern:**
```typescript
const split = splitGigsByTaxTreatment(allGigs, payerMap);

// W-2 summary export
const w2Summary = split.w2.map(gig => ({
  date: gig.date,
  payer: gig.payer_name,
  amount: gig.gross_amount,
  tax_treatment: 'w2',
  notes: 'W-2 income - taxes withheld by employer',
}));
```

### JSON Backup

**No filtering - includes all gigs:**
```typescript
// JSON backup includes everything
const jsonBackup = {
  gigs: allGigs, // No filtering
  payers: allPayers,
  expenses: allExpenses,
  // ... etc
};
```

---

## Critical Invariants

These invariants MUST always hold true:

### 1. Schedule C Filtering
```typescript
// INVARIANT: Only contractor_1099 gigs in Schedule C
const scheduleCGigs = filterGigsForScheduleC(gigs, payerMap);
const hasW2 = scheduleCGigs.some(g => {
  const treatment = getEffectiveTaxTreatment(g, payer);
  return treatment === 'w2';
});
assert(hasW2 === false); // Must be false
```

### 2. Tax Set-Aside Calculation
```typescript
// INVARIANT: Tax set-aside excludes W-2 income
const taxBasis = gigs
  .filter(g => !shouldExcludeFromTaxSetAside(g, payer))
  .reduce((sum, g) => sum + g.gross_amount, 0);

// Or use the canonical filter
const contractor1099Gigs = filterGigsForScheduleC(gigs, payerMap);
const taxBasis = contractor1099Gigs.reduce((sum, g) => sum + g.gross_amount, 0);
```

### 3. Income Totals
```typescript
// INVARIANT: Total income includes all gigs
const totalIncome = gigs.reduce((sum, g) => sum + g.gross_amount, 0);

// INVARIANT: Schedule C income excludes W-2
const scheduleCIncome = filterGigsForScheduleC(gigs, payerMap)
  .reduce((sum, g) => sum + g.gross_amount, 0);

// INVARIANT: totalIncome >= scheduleCIncome
assert(totalIncome >= scheduleCIncome);
```

### 4. Adding W-2 Gigs
```typescript
// INVARIANT: Adding W-2 gigs does not change Schedule C totals
const scheduleCBefore = filterGigsForScheduleC(gigs, payerMap);
const totalBefore = scheduleCBefore.reduce((sum, g) => sum + g.gross_amount, 0);

// Add W-2 gig
const gigsWithW2 = [...gigs, newW2Gig];

const scheduleCAfter = filterGigsForScheduleC(gigsWithW2, payerMap);
const totalAfter = scheduleCAfter.reduce((sum, g) => sum + g.gross_amount, 0);

assert(totalBefore === totalAfter); // Must be equal
```

---

## Testing Checklist

### Before Deployment

- [ ] Run `npm test` - all tests pass
- [ ] Run `npm run verify:tax-treatment` - verification passes
- [ ] Run SQL queries from verification doc - results match expected
- [ ] Create golden dataset in app manually
- [ ] Verify dashboard totals match expected
- [ ] Generate all export formats
- [ ] Verify Schedule C exports contain only 1099 gigs
- [ ] Verify W-2 gigs appear in separate W-2 summary
- [ ] Add W-2 gig and verify Schedule C totals unchanged

### After Deployment

- [ ] Smoke test: Create W-2 payer and gig
- [ ] Verify tax set-aside does not include W-2 income
- [ ] Generate exports and spot-check Schedule C
- [ ] Run SQL verification queries on production data

### Regression Testing

After any changes to:
- Tax treatment logic
- Export generators
- Dashboard calculations
- YTD queries

**Run:**
1. `npm test`
2. `npm run verify:tax-treatment`
3. Manual testing with golden dataset

---

## Common Issues

### Issue: W-2 gigs appearing in Schedule C export

**Diagnosis:**
```sql
-- Find W-2 gigs that might be leaking
SELECT g.id, g.title, p.name, 
       COALESCE(g.tax_treatment, p.tax_treatment) as treatment
FROM gigs g
JOIN payers p ON g.payer_id = p.id
WHERE COALESCE(g.tax_treatment, p.tax_treatment) = 'w2';
```

**Fix:** Ensure export generator uses `filterGigsForScheduleC()`:
```typescript
// Before (WRONG)
const gigsForExport = allGigs;

// After (CORRECT)
const gigsForExport = filterGigsForScheduleC(allGigs, payerMap);
```

### Issue: Tax set-aside including W-2 income

**Diagnosis:** Check YTD query in `useGigTaxCalculation.ts`

**Fix:** Ensure query filters by tax treatment:
```sql
WHERE COALESCE(g.tax_treatment, p.tax_treatment, 'contractor_1099') = 'contractor_1099'
```

### Issue: Tests failing

**Diagnosis:** Run `npm test` to see which tests fail

**Fix:** 
- Check that golden dataset is valid
- Verify helper functions return expected values
- Ensure no regressions in tax treatment logic

---

## Files Modified/Created

### New Files
- `src/lib/__tests__/fixtures/taxTreatmentGoldenDataset.ts` - Golden test dataset
- `src/lib/__tests__/taxTreatment.test.ts` - Unit tests
- `scripts/verify-tax-treatment-exports.ts` - Verification script
- `vitest.config.ts` - Vitest configuration
- `TAX_TREATMENT_VERIFICATION.md` - Verification documentation
- `TAX_TREATMENT_GUARDRAILS_SUMMARY.md` - This file

### Modified Files
- `src/lib/taxTreatment.ts` - Added filtering and splitting functions
- `package.json` - Added vitest, tsx, test scripts

### Files That Need Updates (TODO)
- Export generators in `src/lib/exports/` - Need to use `filterGigsForScheduleC()`
- Dashboard calculations - Verify using correct filtering
- YTD queries - Already updated in previous implementation

---

## Next Steps (TODO)

### 1. Update Export Generators

**Priority: HIGH - CRITICAL**

Each export generator must be updated to use `filterGigsForScheduleC()`:

- [ ] `src/lib/exports/turbotax-online-pack.ts`
- [ ] `src/lib/exports/txf-generator.ts`
- [ ] `src/lib/exports/pdf-generator.ts`
- [ ] `src/lib/csvExport.ts`
- [ ] Any other export-related files

**Pattern to follow:**
```typescript
import { filterGigsForScheduleC, splitGigsByTaxTreatment } from '../taxTreatment';

// Create payer map
const payerMap = new Map(payers.map(p => [p.id, p]));

// For Schedule C exports
const scheduleCGigs = filterGigsForScheduleC(gigs, payerMap);

// For separate W-2/1099 exports
const split = splitGigsByTaxTreatment(gigs, payerMap);
// split.w2 - for W-2 summary
// split.contractor_1099 - for Schedule C
```

### 2. Add Export Tests

Create tests that verify exports use correct filtering:

```typescript
describe('Export Generators', () => {
  it('Schedule C export should only include 1099 gigs', () => {
    const export = generateScheduleCExport(GOLDEN_GIGS, GOLDEN_PAYERS);
    const gigIds = extractGigIds(export);
    expect(gigIds).toEqual(GOLDEN_EXPECTED.exports.scheduleCGigIds);
  });
});
```

### 3. Dashboard Verification

Verify dashboard calculations use correct filtering:
- [ ] YTD income calculation
- [ ] Tax set-aside calculation
- [ ] Income breakdown display

### 4. Documentation Updates

- [ ] Update export documentation with W-2 exclusion notes
- [ ] Add tooltips in UI explaining W-2 vs 1099 treatment
- [ ] Update user-facing help docs

---

## Assumptions & Limitations

### Current Expense Model
- Expenses are not currently allocated by tax treatment
- All expenses are included in Schedule C calculations
- If future requirement: allocate expenses to specific gigs/payers, update logic accordingly

### Default Behavior
- Gigs with no explicit tax_treatment inherit from payer
- Payers with no tax_treatment default to 'contractor_1099'
- This ensures backward compatibility with existing data

### Edge Cases
- "Other" tax treatment is excluded from Schedule C (conservative approach)
- If "other" should be included, update `shouldIncludeInScheduleC()` logic

---

## Support

For questions or issues:
1. Review this document
2. Check `TAX_TREATMENT_VERIFICATION.md` for SQL queries
3. Run `npm run verify:tax-treatment` to check invariants
4. Review unit tests in `src/lib/__tests__/taxTreatment.test.ts`
5. Check implementation in `src/lib/taxTreatment.ts`

---

## Success Criteria

Implementation is successful when:
- ✅ All unit tests pass
- ✅ Verification script passes
- ✅ SQL queries return expected values
- ✅ Schedule C exports contain only 1099 gigs
- ✅ W-2 gigs appear in separate W-2 summary
- ✅ Tax set-aside excludes W-2 income
- ✅ Adding W-2 gigs does not change Schedule C totals
- ✅ Dashboard displays correct income breakdown
