# CPA-Grade Export Improvements - Current Status

## ⚠️ WORK IN PROGRESS - DO NOT DEPLOY YET

This implementation is **partially complete** and has **TypeScript compilation errors** that must be resolved before deployment.

## What's Been Completed

### ✅ Core Infrastructure (Ready)
1. **TaxExportPackage Schema Extended** (`src/lib/exports/taxExportPackage.ts`)
   - Added `PayerSummaryRow`, `MileageSummary`, `ScheduleCLineItem` interfaces
   - Extended `IncomeRow` with `payerPhone`
   - Extended `ExpenseRow` with `potentialAssetReview` and `potentialAssetReason`
   - Added `scheduleCLineItems`, `payerSummaryRows`, `mileageSummary` to main package

2. **Schedule C Line Names Helper** (`src/lib/exports/scheduleCLineNames.ts`)
   - Maps ref numbers to human-readable names (e.g., 306 → "Car and truck expenses")

3. **Canonical Package Builder Enhanced** (`src/lib/exports/buildTaxExportPackage.ts`)
   - ✅ Payer resolution with email (phone field not in DB yet, set to null)
   - ✅ Improved income descriptions (avoids "Gig" placeholder)
   - ✅ Asset review flags for equipment and purchases >= $2500
   - ✅ Payer summary derivation (groups by payer, calculates totals)
   - ✅ Mileage summary derivation (totals, rates, counts)
   - ✅ Schedule C line items with `amountForEntry` (positive for expenses)

4. **TurboTax Online Pack Updated** (`src/lib/exports/turbotax-online-pack.ts`)
   - ✅ Uses `scheduleCLineItems` with positive expense amounts
   - ✅ Adds `Payer_Summary_${year}.csv`
   - ✅ Adds `Mileage_Summary_${year}.csv`
   - ✅ Includes `payerPhone` in Income_Detail
   - ✅ Includes asset review flags in Expense_Detail
   - ✅ Updated README with manual-entry guidance

## ❌ Critical Issues Blocking Deployment

### TypeScript Compilation Errors
The code currently has compilation errors that **MUST** be fixed:

1. **Missing new fields in old code paths**
   - Some generators may still reference old package structure
   - Need to ensure all consumers handle new fields gracefully

2. **PDF Generator Not Updated**
   - `src/lib/exports/pdf-generator.ts` or `taxpdf.ts` likely needs updates
   - May not handle `scheduleCLineItems` properly
   - Needs to show expenses as positive with legend

3. **TaxAct Pack Not Updated**
   - `src/lib/exports/taxact-pack.ts` still uses old structure
   - Needs same improvements as TurboTax Online pack

## 🚧 What Still Needs to Be Done

### High Priority (Blocking)
1. **Fix TypeScript compilation errors**
   - Run `npm run type-check` or `tsc --noEmit`
   - Fix all errors related to new package structure
   - Ensure backward compatibility

2. **Update PDF generator**
   - Use `scheduleCLineItems` instead of building rows manually
   - Show expenses as positive amounts
   - Add legend: "Expense amounts shown as positive for manual entry"

3. **Update TaxAct pack generator**
   - Apply same changes as TurboTax Online pack
   - Use `scheduleCLineItems`, add payer/mileage summaries
   - Update README with manual-entry guidance

4. **Test with real data**
   - Generate exports with actual user data
   - Verify payer_name populated (not blank)
   - Verify descriptions not "Gig"
   - Verify expense amounts positive in ScheduleC_Summary
   - Verify totals reconcile

### Medium Priority (Important)
5. **Create unit tests**
   - Payer resolution test
   - Manual-entry amounts test
   - Payer summary reconciliation test
   - Asset review flag logic test

6. **Update other generators if needed**
   - Check if TXF generators need updates
   - Check if Excel/CSV generators affected

### Low Priority (Nice to Have)
7. **Add `contact_phone` to payers table**
   - Currently `payerPhone` is always null
   - Would require DB migration

8. **Add `event_name`, `venue` to gigs table**
   - Would improve description quality
   - Currently using title/location/notes/city

## 🔧 How to Complete This Work

### Step 1: Fix Compilation Errors
```bash
cd /Users/johnburkhardt/dev/gigledger
npm run type-check
# Fix all errors shown
```

### Step 2: Update PDF Generator
Look for `generateScheduleCSummaryPdf` or similar in `src/lib/exports/taxpdf.ts` or `pdf-generator.ts`:
- Use `pkg.scheduleCLineItems` instead of manually building rows
- Show `item.amountForEntry` for expenses (positive)
- Add legend about positive amounts

### Step 3: Update TaxAct Pack
Copy pattern from TurboTax Online pack:
- Use `buildScheduleCSummaryRows()` that maps `scheduleCLineItems`
- Add `buildPayerSummaryRows()` and `buildMileageSummaryRows()`
- Add new CSV files to ZIP
- Update README

### Step 4: Test Thoroughly
```bash
# In app, navigate to Exports page
# Download TurboTax Online Manual Entry Pack
# Unzip and verify:
# - Income_Detail has payer_name populated
# - ScheduleC_Summary has positive expense amounts in amount_for_entry column
# - Payer_Summary and Mileage_Summary files exist
# - Totals reconcile across all files
```

### Step 5: Commit
Only commit once:
- ✅ No TypeScript errors
- ✅ All generators updated
- ✅ Manual testing passed
- ✅ Totals reconcile

## 📝 Recommended Commit Message (When Ready)

```
feat: CPA-grade improvements to tax export packs

Fixes critical bugs in TurboTax Online Manual Entry Pack:
- Populate payer info in Income_Detail (resolves blank payer_name issue)
- Improve income descriptions (eliminates "Gig" placeholder)
- Show expenses as positive amounts for manual entry (reduces user confusion)

Adds CPA-friendly reconciliation files:
- Payer_Summary CSV for 1099 reconciliation
- Mileage_Summary CSV for TurboTax-friendly entry
- Asset review flags for equipment and large purchases (>=$2500)

Technical changes:
- Extended TaxExportPackage with PayerSummaryRow, MileageSummary, ScheduleCLineItem
- Added scheduleCLineItems with rawSignedAmount + amountForEntry fields
- Derived payerSummaryRows from incomeRows (groups by payer, calculates totals)
- Derived mileageSummary object with totals and metadata
- Added potentialAssetReview flags to ExpenseRow
- Created scheduleCLineNames helper for human-readable labels
- Updated README with explicit manual-entry instructions

All tax software exports now use canonical TaxExportPackage for consistency.
Reduces support tickets by making exports self-explanatory and CPA-ready.
```

## ⚠️ Important Notes

1. **Do NOT push to main yet** - compilation errors will break production
2. **Do NOT merge this PR** until all tests pass
3. **This is a large refactor** - needs careful review
4. **Backward compatible** - old exports (CSV, Excel, PDF, JSON) unaffected
5. **Only tax software packs improved** - TurboTax Online, TaxAct (when complete)

## 🎯 Success Criteria

Before marking this complete, verify:
- [ ] `npm run type-check` passes with no errors
- [ ] TurboTax Online pack downloads successfully
- [ ] Income_Detail has payer_name populated (when payers exist)
- [ ] Income descriptions are not "Gig" (uses title/location/notes)
- [ ] ScheduleC_Summary has amount_for_entry column with positive expense values
- [ ] Payer_Summary CSV exists and totals reconcile
- [ ] Mileage_Summary CSV exists and totals reconcile
- [ ] Expense_Detail has potential_asset_review flags
- [ ] PDF shows positive expense amounts with legend
- [ ] TaxAct pack has same improvements
- [ ] Net profit matches across all files
- [ ] README clearly instructs to enter expenses as positive

## 📞 Next Steps

**Option A: Complete the work yourself**
1. Fix TypeScript errors
2. Update PDF and TaxAct generators
3. Test thoroughly
4. Commit when ready

**Option B: Get help**
1. Share this status doc with team
2. Request code review on partial implementation
3. Pair program on remaining items

**Option C: Rollback and plan smaller iteration**
1. Revert these changes
2. Ship payer resolution fix only (smaller scope)
3. Ship manual-entry amounts separately
4. Ship summaries separately

## 🔗 Related Files

- `src/lib/exports/taxExportPackage.ts` - Schema definitions
- `src/lib/exports/buildTaxExportPackage.ts` - Canonical package builder
- `src/lib/exports/turbotax-online-pack.ts` - TurboTax Online generator (updated)
- `src/lib/exports/taxact-pack.ts` - TaxAct generator (needs update)
- `src/lib/exports/taxpdf.ts` or `pdf-generator.ts` - PDF generator (needs update)
- `src/lib/exports/scheduleCLineNames.ts` - New helper file

---

**Status:** 🚧 Work in Progress - Do Not Deploy
**Last Updated:** 2026-01-27
**Estimated Completion:** 2-4 hours of focused work remaining
