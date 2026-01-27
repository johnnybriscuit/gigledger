# Exports CPA-Grade Improvements - Implementation Progress

## Objective
Improve TurboTax Online Manual Entry Pack and all exports to be CPA-grade and self-filer friendly by:
1. Populating payer info correctly (no blank payer_name)
2. Making manual-entry numbers unambiguous (expenses as positive "enter this" amounts)
3. Adding CPA-friendly reconciliation files (payer totals)
4. Adding mileage summary file (TurboTax-friendly)
5. Adding asset review flags for large gear/equipment expenses
6. Keeping EVERYTHING generated from canonical TaxExportPackage

## ✅ Completed

### 1. TaxExportPackage Schema Updates (`src/lib/exports/taxExportPackage.ts`)
- ✅ Added `payerPhone` field to `IncomeRow`
- ✅ Added `potentialAssetReview` and `potentialAssetReason` to `ExpenseRow`
- ✅ Created `PayerSummaryRow` interface
- ✅ Created `MileageSummary` interface
- ✅ Created `ScheduleCLineItem` interface with `rawSignedAmount` and `amountForEntry`
- ✅ Added `scheduleCLineItems`, `payerSummaryRows`, and `mileageSummary` to `TaxExportPackage`

### 2. Schedule C Line Names Helper (`src/lib/exports/scheduleCLineNames.ts`)
- ✅ Created mapping of Schedule C reference numbers to human-readable line names
- ✅ Exported `getScheduleCLineName()` helper function

### 3. buildTaxExportPackage Enhancements (`src/lib/exports/buildTaxExportPackage.ts`)
- ✅ Added payer phone resolution (set to null for now - field not in DB yet)
- ✅ Improved description logic to avoid placeholder "Gig":
  - Tries: title → location → notes (50 chars) → city → "Income"
  - Never uses "Gig" as fallback
- ✅ Added `payerId`, `payerEmail`, `payerPhone` to invoice payment income rows
- ✅ Added potential asset review logic for expenses:
  - Flags equipment/gear categories
  - Flags purchases >= $2500
  - Provides reason string
- ✅ Derived `payerSummaryRows` from income data:
  - Groups by payer_id (or "UNKNOWN")
  - Calculates totals, counts, date ranges
  - Notes missing payers
- ✅ Derived `mileageSummary` object:
  - Total miles, rate, deduction
  - Entry count, estimate flag
  - Helpful notes
- ✅ Built `scheduleCLineItems` array with manual-entry friendly amounts:
  - Income lines: positive amounts
  - Expense lines: `rawSignedAmount` (negative) + `amountForEntry` (positive)
  - Human-readable line names
  - Itemized other expenses

### 4. TurboTax Online Pack Generator (`src/lib/exports/turbotax-online-pack.ts`)
- ✅ Updated `buildScheduleCSummaryRows()` to use `scheduleCLineItems` with `amount_for_entry`
- ✅ Added `payerPhone` to `buildIncomeDetailRows()`
- ✅ Added `potential_asset_review` and `potential_asset_reason` to `buildExpenseDetailRows()`
- ✅ Created `buildPayerSummaryRows()` function
- ✅ Created `buildMileageSummaryRows()` function
- ✅ Updated README with:
  - Clear instructions to enter expenses as POSITIVE
  - Mileage summary usage
  - Payer reconciliation notes
  - Asset review flag explanation
  - Data quality notes section
- ✅ Updated ZIP generation to include:
  - `Payer_Summary_${taxYear}.csv`
  - `Mileage_Summary_${taxYear}.csv`
  - Updated `ScheduleC_Summary_${taxYear}.csv` with new schema
  - Updated `Income_Detail_${taxYear}.csv` with payer_phone
  - Updated `Expense_Detail_${taxYear}.csv` with asset flags

## 🚧 In Progress / Pending

### 5. PDF Generator Updates
- ⏳ Need to update `src/lib/exports/pdf-generator.ts` to:
  - Show expenses as positive amounts with "Enter this amount" style
  - Add legend: "Expense amounts are shown as positive numbers for manual entry"
  - Use `scheduleCLineItems` with `amountForEntry`

### 6. TaxAct Pack Generator Updates
- ⏳ Need to apply same improvements to `src/lib/exports/taxact-pack.ts`:
  - Use `scheduleCLineItems` with `amount_for_entry`
  - Add `payerPhone` to income CSV
  - Add asset review flags to expense CSV
  - Add Payer_Summary and Mileage_Summary CSVs
  - Update README with manual-entry guidance

### 7. Unit Tests
- ⏳ Need to create tests in `src/lib/exports/__tests__/`:
  - Payer resolution test (with and without contact)
  - Manual-entry amounts test (expenses positive)
  - Payer summary totals reconciliation test
  - Mileage summary totals test
  - Asset review flag logic test

### 8. Fix TypeScript Compilation Errors
- ⏳ Current errors to resolve:
  - Old code paths that don't use new `scheduleCLineItems` field
  - PDF generator may need updates to accept new package structure
  - TaxAct generator needs similar updates

## 🔍 Known Issues

### Database Schema Limitations
- `payers` table doesn't have `contact_phone` field yet
  - Currently setting `payerPhone` to `null` in buildTaxExportPackage
  - Can add DB migration later if needed
- `gigs` table doesn't have `event_name` or `venue` fields
  - Simplified description logic to use available fields only

### Backward Compatibility
- Old exports (CSV Bundle, Excel, PDF, JSON) still use legacy data sources
- These should eventually migrate to canonical package but are lower priority
- Current focus: tax software exports (TurboTax Online, TurboTax Desktop, H&R Block, TaxAct)

## 📋 Next Steps

1. **Update PDF generator** to show positive expense amounts with legend
2. **Update TaxAct pack generator** with same improvements as TurboTax Online
3. **Fix any TypeScript compilation errors** in existing code
4. **Create unit tests** for new functionality
5. **Manual QA testing**:
   - Download TurboTax Online pack
   - Verify payer_name populated (when payers exist)
   - Verify description not "Gig"
   - Verify ScheduleC_Summary has positive expense amounts
   - Verify new Payer_Summary and Mileage_Summary files
   - Verify totals reconcile across all files
6. **Commit and push** with detailed commit message

## 🎯 Acceptance Criteria Checklist

- [ ] Income_Detail has payer_id + payer_name populated when payers exist
- [ ] Income description is not placeholder "Gig" (uses title/location/notes/city)
- [ ] ScheduleC_Summary has `amount_for_entry` positive for expenses
- [ ] ScheduleC_Summary has human-readable line names
- [ ] PDF shows expenses as positive "enter this" amounts with legend
- [ ] Pack includes Payer_Summary CSV
- [ ] Pack includes Mileage_Summary CSV
- [ ] Expense_Detail includes `potential_asset_review` flags
- [ ] Totals reconcile across README, PDF, ScheduleC_Summary, and detail CSVs
- [ ] README explicitly instructs to enter expenses as positive
- [ ] TaxAct pack has same improvements
- [ ] Unit tests pass
- [ ] No TypeScript compilation errors

## 📝 Commit Message (Draft)

```
feat: CPA-grade improvements to tax export packs

FIXES:
- Populate payer info in Income_Detail (no more blank payer_name)
- Improve income descriptions (avoid placeholder "Gig")
- Show expenses as positive amounts for manual entry (reduce confusion)

ADDS:
- Payer_Summary CSV for 1099 reconciliation
- Mileage_Summary CSV for TurboTax-friendly entry
- Asset review flags for equipment/large purchases
- ScheduleC_Summary with amount_for_entry column
- Human-readable Schedule C line names

CHANGES:
- All tax software exports use canonical TaxExportPackage
- README updated with clear manual-entry instructions
- PDF shows positive expense amounts with legend
- Expense amounts shown as "enter this" values (positive)

TECHNICAL:
- Extended TaxExportPackage with PayerSummaryRow, MileageSummary, ScheduleCLineItem
- Added scheduleCLineItems derivation with rawSignedAmount + amountForEntry
- Added payerSummaryRows derivation from incomeRows
- Added mileageSummary object with totals
- Added potentialAssetReview flags to ExpenseRow
- Created scheduleCLineNames helper for human-readable labels

Reduces support tickets by making exports self-explanatory and CPA-ready.
Eliminates negative-number confusion in manual entry.
Provides payer reconciliation for 1099 verification.
```

## 🚀 Deployment Notes

- This is a **non-breaking change** - old exports still work
- New fields are additive to TaxExportPackage
- Existing export handlers (CSV, Excel, PDF, JSON) unaffected
- Only tax software packs (TurboTax Online, TaxAct) get improvements
- Can deploy incrementally and test in production
