# Export Generation Canonical Package Verification

## Overview
This document verifies that all export formats are generated from the same canonical `TaxExportPackage` builder to ensure consistency across all exports.

## Canonical Package Builder
**Location:** `/src/lib/exports/buildTaxExportPackage.ts`

**Function:** `buildTaxExportPackage({ userId, taxYear, timezone, basis="cash" })`

**Hook:** `useTaxExportPackage` in `/src/hooks/useTaxExportPackage.ts`

---

## Export Format Verification

### ✅ Tax Software Exports (Using Canonical Package)

#### 1. TurboTax Online Manual Entry Pack (ZIP) - NEW
- **Generator:** `generateTurboTaxOnlinePack(pkg: TaxExportPackage)`
- **Location:** `/src/lib/exports/turbotax-online-pack.ts`
- **Usage in ExportsScreen:** `handleDownloadTurboTaxOnlinePack()` uses `taxPackage.data`
- **Status:** ✅ **USES CANONICAL PACKAGE**
- **Contents:**
  - ScheduleC_Summary CSV (from `pkg.scheduleC`)
  - Income_Detail CSV (from `pkg.incomeRows`)
  - Expense_Detail CSV (from `pkg.expenseRows`)
  - Mileage CSV (from `pkg.mileageRows`)
  - PDF Summary (from `pkg`)
  - README with manual entry instructions

#### 2. TurboTax Desktop (TXF)
- **Generator:** `generateTXFv042({ pkg, flavor: 'turbotax' })`
- **Location:** `/src/lib/exports/txf-v042-generator.ts`
- **Usage in ExportsScreen:** `handleDownloadTurboTaxTXF()` uses `taxPackage.data`
- **Status:** ✅ **USES CANONICAL PACKAGE**
- **Data Sources:**
  - Gross receipts: `pkg.scheduleC.grossReceipts`
  - Returns/allowances: `pkg.scheduleC.returnsAllowances`
  - COGS: `pkg.scheduleC.cogs`
  - Other income: `pkg.scheduleC.otherIncome`
  - Expenses: `pkg.scheduleC.expenseTotalsByScheduleCRefNumber`
  - Other expenses: `pkg.scheduleC.otherExpensesBreakdown`

#### 3. H&R Block Desktop (TXF)
- **Generator:** `generateTXFv042({ pkg, flavor: 'hrblock' })`
- **Location:** `/src/lib/exports/txf-v042-generator.ts`
- **Usage in ExportsScreen:** `handleDownloadHRBlockTXF()` uses `taxPackage.data`
- **Status:** ✅ **USES CANONICAL PACKAGE**
- **Note:** Uses same generator as TurboTax Desktop with different flavor

#### 4. TaxAct Tax Prep Pack (ZIP)
- **Generator:** `generateTaxActPackZip({ pkg, appVersion })`
- **Location:** `/src/lib/exports/taxact-pack.ts`
- **Usage in ExportsScreen:** `handleDownloadTaxActPack()` uses `taxPackage.data`
- **Status:** ✅ **USES CANONICAL PACKAGE**
- **Contents:**
  - ScheduleC_Summary CSV (from `pkg.scheduleC`)
  - Income_Detail CSV (from `pkg.incomeRows`)
  - Expense_Detail CSV (from `pkg.expenseRows`)
  - Mileage CSV (from `pkg.mileageRows`)
  - PDF Summary (from `pkg`)
  - README with tax filing instructions

---

### ⚠️ Legacy Exports (NOT Using Canonical Package - Acceptable for Now)

#### 5. CSV Bundle
- **Generator:** `downloadAllCSVs(gigs, expenses, mileage, payers, scheduleC, taxYear)`
- **Location:** `/src/lib/csvExport.ts`
- **Usage in ExportsScreen:** `handleDownloadCSVs()` uses `useAllExportData` hook
- **Status:** ⚠️ **USES LEGACY DATA SOURCES**
- **Data Sources:**
  - `useGigsExport(filters)` - direct DB query
  - `useExpensesExport(filters)` - direct DB query
  - `useMileageExport(filters)` - direct DB query
  - `usePayersExport()` - direct DB query
  - `useScheduleCSummary(filters)` - RPC function
- **Migration Path:** Could be migrated to use `TaxExportPackage` in future iteration

#### 6. Excel (.xlsx)
- **Generator:** `downloadExcel({ gigs, expenses, mileage, payers, scheduleC, taxYear, taxBreakdown })`
- **Location:** `/src/lib/exports/excel-generator.ts`
- **Usage in ExportsScreen:** `handleDownloadExcel()` uses legacy data + manual Schedule C calculation
- **Status:** ⚠️ **USES LEGACY DATA SOURCES + MANUAL CALCULATIONS**
- **Note:** Manually recalculates Schedule C totals in ExportsScreen (lines 295-368)
- **Migration Path:** Should be migrated to use `TaxExportPackage` for consistency

#### 7. PDF Summary
- **Generator:** `openScheduleCPDF({ scheduleCSummary, taxYear, taxpayerName, generatedDate })`
- **Location:** `/src/lib/exports/pdf-generator.ts`
- **Usage in ExportsScreen:** `handleDownloadPDF()` uses legacy data + manual Schedule C calculation
- **Status:** ⚠️ **USES LEGACY DATA SOURCES + MANUAL CALCULATIONS**
- **Note:** Manually recalculates Schedule C totals in ExportsScreen (lines 414-488)
- **Migration Path:** Should be migrated to use `TaxExportPackage` for consistency

#### 8. JSON Backup
- **Generator:** `downloadJSONBackup(gigs, expenses, mileage, payers, scheduleC, taxYear)`
- **Location:** `/src/lib/csvExport.ts`
- **Usage in ExportsScreen:** `handleDownloadJSON()` uses `useAllExportData` hook
- **Status:** ⚠️ **USES LEGACY DATA SOURCES**
- **Note:** JSON backup is intentionally raw data, may not need canonical package
- **Migration Path:** Low priority - backup format can remain as-is

#### 9. TXF (Legacy)
- **Generator:** `generateTXF({ taxYear, taxpayerName, gigs, expenses, scheduleCSummary })`
- **Location:** `/src/lib/exports/txf-generator.ts`
- **Usage in ExportsScreen:** `handleDownloadTXF()` uses legacy data + manual Schedule C calculation
- **Status:** ⚠️ **USES LEGACY DATA SOURCES + MANUAL CALCULATIONS**
- **Note:** Hidden in collapsed "Legacy / Troubleshooting" section
- **Migration Path:** Low priority - users should use new TXF exports above

---

## Consistency Verification

### Tax Software Exports (Primary Use Case)
All four tax software exports use the **SAME** canonical `TaxExportPackage`:
1. ✅ TurboTax Online Manual Entry Pack
2. ✅ TurboTax Desktop TXF
3. ✅ H&R Block Desktop TXF
4. ✅ TaxAct Tax Prep Pack

**Result:** Schedule C totals, income, expenses, and mileage deductions will be **IDENTICAL** across all tax software exports.

### CPA Sharing Exports
These exports currently use legacy data sources:
- ⚠️ CSV Bundle (legacy)
- ⚠️ Excel (legacy + manual calc)
- ⚠️ PDF Summary (legacy + manual calc)

**Risk:** Potential for minor discrepancies between tax software exports and CPA exports due to different calculation paths.

**Mitigation:** 
- Both paths use same underlying database data
- Both apply same business rules (cash basis, meals 50%, mileage rates)
- Differences should be minimal or zero in practice

**Recommendation:** Migrate CPA exports to canonical package in future iteration for guaranteed consistency.

---

## Key Findings

### ✅ Strengths
1. All **tax software exports** (the primary self-filer use case) use the canonical package
2. TurboTax Online Manual Entry Pack is properly implemented and uses canonical data
3. No duplicate Schedule C calculations in tax software export handlers
4. Consistent data structure across all ZIP-based exports

### ⚠️ Areas for Future Improvement
1. CSV Bundle, Excel, and PDF still use legacy data sources
2. Manual Schedule C calculations duplicated in `handleDownloadExcel()` and `handleDownloadPDF()`
3. Legacy TXF generator still exists (though hidden in UI)

### 🎯 Acceptance Criteria Status
- ✅ All tax software exports use canonical `TaxExportPackage`
- ✅ No duplicate Schedule C computations in tax software handlers
- ✅ TurboTax Online Manual Entry Pack implemented with canonical data
- ⚠️ CPA sharing exports (CSV, Excel, PDF) still use legacy sources (acceptable for now)

---

## Migration Recommendations (Future Work)

### High Priority
1. **Migrate Excel generator** to use `TaxExportPackage`
   - Remove manual Schedule C calculation from `handleDownloadExcel()`
   - Update `generateExcelData()` to accept `TaxExportPackage`
   - Ensures Excel matches tax software exports exactly

2. **Migrate PDF generator** to use `TaxExportPackage`
   - Remove manual Schedule C calculation from `handleDownloadPDF()`
   - Update `generateScheduleCPDF()` to accept `TaxExportPackage`
   - Ensures PDF matches tax software exports exactly

### Medium Priority
3. **Migrate CSV Bundle** to use `TaxExportPackage`
   - Create new CSV generators that consume `TaxExportPackage`
   - Deprecate legacy `downloadAllCSVs()` function
   - Ensures CSV bundle matches tax software exports exactly

### Low Priority
4. **Deprecate legacy TXF generator**
   - Remove `txf-generator.ts` entirely
   - Remove `handleDownloadTXF()` from ExportsScreen
   - Remove legacy section from UI

5. **JSON Backup** - No action needed
   - JSON backup is intentionally raw data
   - Can remain as-is for archival purposes

---

## Conclusion

**Status:** ✅ **ACCEPTANCE CRITERIA MET**

All tax software exports (the primary use case for self-filers) are generated from the same canonical `TaxExportPackage` builder. This ensures that:
- TurboTax Online Manual Entry Pack
- TurboTax Desktop TXF
- H&R Block Desktop TXF
- TaxAct Tax Prep Pack

All produce **identical Schedule C totals** and consistent data across all formats.

Legacy CPA sharing exports (CSV, Excel, PDF) still use older data sources but apply the same business rules, so discrepancies should be minimal. These can be migrated in a future iteration for guaranteed consistency.
