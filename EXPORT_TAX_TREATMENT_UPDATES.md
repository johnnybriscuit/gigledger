# Export Tax Treatment Updates - Implementation Summary

## Overview

This document summarizes the updates made to all export generators to ensure W-2 gigs are correctly excluded from Schedule C / self-employment calculations.

**Critical Requirement:** W-2 gigs must NEVER appear in Schedule C exports. They are tracked separately for informational purposes only.

---

## Files Modified

### 1. Core Export Infrastructure

#### `src/lib/exports/taxExportPackage.ts`
- **Change:** Added `taxTreatment` field to `IncomeRow` interface
- **Purpose:** Track tax treatment for each income row to enable filtering
- **Type:** `taxTreatment?: 'w2' | 'contractor_1099' | 'other' | null`

#### `src/lib/exports/buildTaxExportPackage.ts`
- **Changes:**
  1. Import tax treatment helpers from `../taxTreatment`
  2. Calculate effective tax treatment for each gig using `getEffectiveTaxTreatment()`
  3. Add `taxTreatment` field to income rows
  4. Filter income rows for Schedule C calculations:
     - `scheduleCIncomeRows` = only contractor_1099 gigs
     - `w2IncomeRows` = W-2 gigs (excluded from Schedule C)
     - `invoicePaymentRows` = invoice payments (included in Schedule C)
  5. Calculate Schedule C gross receipts from filtered rows only
  6. Add warning when W-2 gigs are excluded
- **Impact:** Core export package now correctly separates W-2 from 1099 income

### 2. TurboTax Online Pack

#### `src/lib/exports/turbotax-online-pack.ts`
- **Changes:**
  1. Updated `buildIncomeDetailRows()` to filter for Schedule C (1099 only)
  2. Added `buildW2IncomeSummaryRows()` function for W-2 summary export
  3. Added `W2_Income_Summary_${taxYear}.csv` to ZIP if W-2 gigs exist
  4. Updated README to document W-2 exclusion
  5. Added "CRITICAL: W-2 vs 1099 Income Treatment" section to README
- **Files in ZIP:**
  - ✅ `ScheduleC_Summary_${taxYear}.csv` - 1099 income only
  - ✅ `Income_Detail_${taxYear}.csv` - 1099 contractor income only
  - ✅ `W2_Income_Summary_${taxYear}.csv` - W-2 informational summary (if present)
  - All other files unchanged

### 3. TXF Generator

#### `src/lib/exports/txf-generator.ts`
- **Changes:**
  1. Added documentation header explaining W-2 exclusion
  2. Imported `TaxExportPackage` type
- **Note:** TXF generator already uses `scheduleCSummary` which is calculated from filtered income, so no additional filtering needed in TXF generation itself
- **Documentation:** Clear note that TXF includes 1099 only, W-2 provided separately

---

## Remaining Export Generators (TODO)

### High Priority

1. **CSV Bundle Generator** (`src/lib/exports/csv-bundle-generator.ts`)
   - Split gigs into separate CSVs: `Gigs_1099.csv`, `Gigs_W2.csv`
   - Ensure `ScheduleC_Summary.csv` uses filtered income

2. **Excel Generator** (`src/lib/exports/excel-generator.ts` or `excel-generator-canonical.ts`)
   - Add separate sheets: "1099 Gigs", "W-2 Gigs", "Schedule C Summary"
   - Ensure Schedule C sheet references only 1099 gigs

3. **PDF Generator** (`src/lib/exports/pdf-generator.ts` or `taxpdf.ts`)
   - Add "W-2 Tracked Income (Informational)" section
   - Ensure "Schedule C Summary" section uses filtered income

4. **TaxAct Pack** (`src/lib/exports/taxact-pack.ts`)
   - Similar to TurboTax Online Pack
   - Add W-2 summary file
   - Filter Schedule C content to 1099 only

### Medium Priority

5. **JSON Backup Generator** (`src/lib/exports/json-backup-generator.ts`)
   - No filtering needed (includes all data)
   - Ensure `taxTreatment` field is included in output

---

## Implementation Pattern

For each export generator, follow this pattern:

```typescript
// 1. Filter income rows for Schedule C (1099 only)
const scheduleCIncomeRows = pkg.incomeRows.filter(r => 
  r.source === 'invoice_payment' || r.taxTreatment === 'contractor_1099'
);

// 2. Separate W-2 income for informational export
const w2IncomeRows = pkg.incomeRows.filter(r => 
  r.source === 'gig' && r.taxTreatment === 'w2'
);

// 3. Use scheduleCIncomeRows for all Schedule C calculations/exports

// 4. Export W-2 summary separately (if w2IncomeRows.length > 0)
const w2Summary = w2IncomeRows.map(r => ({
  date: r.receivedDate,
  payer: r.payerName,
  amount: r.amount,
  tax_treatment: 'w2',
  notes: 'W-2 income - taxes withheld by employer. NOT included in Schedule C.',
}));
```

---

## Testing Requirements

### Unit Tests (TODO)

Create `src/lib/__tests__/exportsTaxTreatment.test.ts`:

```typescript
import { GOLDEN_GIGS, GOLDEN_PAYERS, GOLDEN_EXPECTED } from './fixtures/taxTreatmentGoldenDataset';
import { buildTaxExportPackageFromData } from '../exports/buildTaxExportPackage';

describe('Export Tax Treatment', () => {
  it('Schedule C income should equal 1099 income only', () => {
    const pkg = buildTaxExportPackageFromData({
      gigs: GOLDEN_GIGS,
      payers: GOLDEN_PAYERS,
      // ... other params
    });
    
    expect(pkg.scheduleC.grossReceipts).toBe(GOLDEN_EXPECTED.scheduleCGrossIncome);
  });
  
  it('W-2 gigs should not appear in Schedule C income rows', () => {
    const pkg = buildTaxExportPackageFromData({...});
    const scheduleCIncomeRows = pkg.incomeRows.filter(r => 
      r.source === 'invoice_payment' || r.taxTreatment === 'contractor_1099'
    );
    
    const hasW2 = scheduleCIncomeRows.some(r => r.taxTreatment === 'w2');
    expect(hasW2).toBe(false);
  });
});
```

### Manual QA Checklist

For each export format:
- [ ] Generate export with golden dataset (1 W-2 gig, 2 1099 gigs)
- [ ] Verify Schedule C income = $1,500 (not $2,500)
- [ ] Verify W-2 gigs do NOT appear in Schedule C detail files
- [ ] Verify W-2 gigs appear in separate W-2 summary (if applicable)
- [ ] Verify export documentation mentions W-2 exclusion

---

## UI Updates (TODO)

### Export Card Labels

Update export card descriptions in `src/components/ExportCard.tsx` or `src/screens/ExportsScreen.tsx`:

**Before:**
```
"TurboTax Online Manual Entry Pack - CSV files for manual entry"
```

**After:**
```
"TurboTax Online Manual Entry Pack - Schedule C (1099 income only) + W-2 summary"
```

### Export Tooltips

Add tooltips explaining:
- "Schedule C exports include 1099 contractor income only"
- "W-2 income is tracked separately (taxes already withheld)"
- "Do not manually add W-2 income to Schedule C"

---

## Verification Steps

### 1. Run Unit Tests
```bash
npm test
npm run verify:tax-treatment
```

### 2. Run SQL Verification
Execute queries from `TAX_TREATMENT_VERIFICATION.md`:
```sql
-- Should return 1099 income only
SELECT SUM(gross_amount) 
FROM gigs g
LEFT JOIN payers p ON g.payer_id = p.id
WHERE COALESCE(g.tax_treatment, p.tax_treatment, 'contractor_1099') = 'contractor_1099';
```

### 3. Manual Export Testing
1. Create golden dataset in app
2. Generate each export format
3. Verify Schedule C totals = $1,500
4. Verify W-2 summary exists and shows $1,000

---

## Success Criteria

Implementation is complete when:
- ✅ Core export package filters W-2 from Schedule C calculations
- ✅ TurboTax Online Pack includes W-2 summary and filters Schedule C
- ✅ TXF generator documented (uses pre-filtered Schedule C data)
- ⏳ CSV bundle generator splits W-2 and 1099
- ⏳ Excel generator has separate W-2 sheet
- ⏳ PDF generator has W-2 informational section
- ⏳ TaxAct pack includes W-2 summary
- ⏳ Export-level tests pass
- ⏳ UI labels updated
- ⏳ Manual QA checklist completed

---

## Next Steps

1. **Complete remaining export generators** (CSV, Excel, PDF, TaxAct)
2. **Create export-level tests**
3. **Update UI labels and tooltips**
4. **Run comprehensive testing**
5. **Deploy and monitor**

---

## Notes

- **Backward Compatibility:** All existing data continues to work. Gigs without explicit `tax_treatment` inherit from payer or default to `contractor_1099`.
- **No Breaking Changes:** Exports without W-2 gigs work exactly as before.
- **Conservative Approach:** "Other" tax treatment is also excluded from Schedule C (only `contractor_1099` is included).

---

## Support

For questions:
- Review `TAX_TREATMENT_VERIFICATION.md` for SQL queries
- Review `TAX_TREATMENT_GUARDRAILS_SUMMARY.md` for implementation details
- Run `npm run verify:tax-treatment` to check invariants
