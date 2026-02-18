# Tax Treatment Verification Guide

This document provides SQL queries and procedures to verify that W-2 vs 1099 tax treatment is correctly implemented across the application.

## Golden Dataset Expected Values

When testing with the golden dataset:
- **Total Income**: $2,500 (all gigs)
- **W-2 Income**: $1,000 (excluded from Schedule C)
- **1099 Income**: $1,500 (included in Schedule C)
- **Expenses**: $300
- **Schedule C Net**: $1,200 ($1,500 - $300)
- **Tax Set-Aside Basis**: $1,200 (1099 net only)

## Critical Invariants

1. **W-2 gigs MUST NEVER appear in Schedule C exports**
2. **Tax set-aside calculations MUST exclude W-2 income**
3. **Total income displays SHOULD include all gigs (W-2 + 1099 + other)**
4. **Adding/removing W-2 gigs MUST NOT change Schedule C totals**

---

## Database Verification Queries

### 1. Total Income by Tax Treatment

```sql
-- Get income breakdown by tax treatment for current year
SELECT 
  COALESCE(g.tax_treatment, p.tax_treatment, 'contractor_1099') as effective_treatment,
  COUNT(*) as gig_count,
  SUM(g.gross_amount + COALESCE(g.tips, 0) + COALESCE(g.per_diem, 0) + COALESCE(g.other_income, 0) - COALESCE(g.fees, 0)) as total_income
FROM gigs g
LEFT JOIN payers p ON g.payer_id = p.id
WHERE g.date >= DATE_TRUNC('year', CURRENT_DATE)
  AND g.user_id = '<your-user-id>'
GROUP BY effective_treatment
ORDER BY effective_treatment;
```

**Expected Output:**
```
effective_treatment | gig_count | total_income
--------------------|-----------|-------------
contractor_1099     |     2     |    1500.00
w2                  |     1     |    1000.00
```

### 2. Schedule C Income (1099 Only)

```sql
-- Get ONLY 1099 contractor income (what should appear in Schedule C)
SELECT 
  SUM(g.gross_amount + COALESCE(g.tips, 0) + COALESCE(g.per_diem, 0) + COALESCE(g.other_income, 0) - COALESCE(g.fees, 0)) as schedule_c_income
FROM gigs g
LEFT JOIN payers p ON g.payer_id = p.id
WHERE g.date >= DATE_TRUNC('year', CURRENT_DATE)
  AND g.user_id = '<your-user-id>'
  AND COALESCE(g.tax_treatment, p.tax_treatment, 'contractor_1099') = 'contractor_1099';
```

**Expected Output:** `1500.00`

### 3. W-2 Income (Excluded from Schedule C)

```sql
-- Get W-2 income (should NOT appear in Schedule C)
SELECT 
  SUM(g.gross_amount + COALESCE(g.tips, 0) + COALESCE(g.per_diem, 0) + COALESCE(g.other_income, 0) - COALESCE(g.fees, 0)) as w2_income
FROM gigs g
LEFT JOIN payers p ON g.payer_id = p.id
WHERE g.date >= DATE_TRUNC('year', CURRENT_DATE)
  AND g.user_id = '<your-user-id>'
  AND COALESCE(g.tax_treatment, p.tax_treatment, 'contractor_1099') = 'w2';
```

**Expected Output:** `1000.00`

### 4. Verify No W-2 Leakage

```sql
-- This query should return 0 rows (no W-2 gigs in Schedule C data)
SELECT 
  g.id,
  g.title,
  g.gross_amount,
  p.name as payer_name,
  COALESCE(g.tax_treatment, p.tax_treatment) as effective_treatment
FROM gigs g
LEFT JOIN payers p ON g.payer_id = p.id
WHERE g.date >= DATE_TRUNC('year', CURRENT_DATE)
  AND g.user_id = '<your-user-id>'
  AND COALESCE(g.tax_treatment, p.tax_treatment, 'contractor_1099') = 'w2'
  AND g.id IN (
    -- This subquery represents gigs that would be in Schedule C export
    -- If this returns any rows, W-2 is leaking into Schedule C
    SELECT id FROM gigs WHERE user_id = '<your-user-id>'
  );
```

**Expected Output:** 0 rows

### 5. Tax Set-Aside Basis Calculation

```sql
-- Calculate tax set-aside basis (1099 income - expenses)
WITH contractor_income AS (
  SELECT 
    SUM(g.gross_amount + COALESCE(g.tips, 0) + COALESCE(g.per_diem, 0) + COALESCE(g.other_income, 0) - COALESCE(g.fees, 0)) as income
  FROM gigs g
  LEFT JOIN payers p ON g.payer_id = p.id
  WHERE g.date >= DATE_TRUNC('year', CURRENT_DATE)
    AND g.user_id = '<your-user-id>'
    AND COALESCE(g.tax_treatment, p.tax_treatment, 'contractor_1099') = 'contractor_1099'
),
total_expenses AS (
  SELECT SUM(amount) as expenses
  FROM expenses
  WHERE date >= DATE_TRUNC('year', CURRENT_DATE)
    AND user_id = '<your-user-id>'
)
SELECT 
  ci.income as contractor_income,
  te.expenses as total_expenses,
  ci.income - COALESCE(te.expenses, 0) as tax_basis
FROM contractor_income ci, total_expenses te;
```

**Expected Output:**
```
contractor_income | total_expenses | tax_basis
------------------|----------------|----------
      1500.00     |     300.00     |  1200.00
```

### 6. Gig Count by Treatment

```sql
-- Count gigs by effective tax treatment
SELECT 
  COALESCE(g.tax_treatment, p.tax_treatment, 'contractor_1099') as effective_treatment,
  COUNT(*) as count
FROM gigs g
LEFT JOIN payers p ON g.payer_id = p.id
WHERE g.date >= DATE_TRUNC('year', CURRENT_DATE)
  AND g.user_id = '<your-user-id>'
GROUP BY effective_treatment;
```

**Expected Output:**
```
effective_treatment | count
--------------------|------
contractor_1099     |   2
w2                  |   1
```

---

## UI Verification Steps

### Dashboard Checks

1. **Total Income Card**
   - Should show: $2,500
   - May optionally show breakdown: W-2: $1,000, 1099: $1,500

2. **Tax Set-Aside Card**
   - Calculation should be based on: $1,200 (1099 net only)
   - Should NOT change when W-2 gigs are added/removed

3. **YTD Income Display**
   - Total: $2,500
   - If breakdown shown: W-2: $1,000, 1099: $1,500

### Gigs List Checks

1. **Tax Treatment Badge**
   - W-2 gigs should show "W-2" badge
   - 1099 gigs should show "1099" badge

2. **Filtering**
   - Should be able to filter by tax treatment
   - Counts should match database queries

### Payer Form Checks

1. **Tax Treatment Selector**
   - Should have 3 options: W-2, 1099, Other
   - W-2 should show optional employer details
   - 1099 should show optional tax ID fields

---

## Export Verification

### Schedule C Exports (TurboTax, TaxAct, TXF, CSV)

**CRITICAL: These exports MUST contain ONLY 1099 gigs**

1. **TurboTax Online Manual Entry Pack**
   - `ScheduleC_Summary.csv` should show $1,500 income
   - `ScheduleC_Detail.csv` should contain only gig-1099-1 and gig-1099-2
   - `W2_Income_Summary.csv` should contain gig-w2-1

2. **TXF Exports (TurboTax Desktop, H&R Block)**
   - Should contain only 1099 gigs
   - Total income in TXF should be $1,500
   - W-2 should be in separate CSV summary

3. **CSV Bundle**
   - `Gigs_1099.csv` - 2 rows, $1,500 total
   - `Gigs_W2.csv` - 1 row, $1,000 total
   - `ScheduleC_Summary.csv` - $1,500 income, $300 expenses, $1,200 net

4. **Excel Export**
   - Separate sheets: "1099 Gigs", "W-2 Gigs", "Schedule C Summary"
   - Schedule C sheet should reference only 1099 gigs

5. **PDF Summary**
   - Section 1: "Self-Employed (1099) Summary" - $1,500
   - Section 2: "W-2 Tracked Income (Informational)" - $1,000
   - Clear labeling that W-2 is not included in Schedule C

6. **JSON Backup**
   - Should include all gigs with tax_treatment field
   - No filtering (includes W-2, 1099, other)

### Export Verification Checklist

For each export format:
- [ ] Schedule C income = $1,500 (not $2,500)
- [ ] W-2 gigs do NOT appear in Schedule C data
- [ ] W-2 gigs appear in separate W-2 summary (if applicable)
- [ ] Gig IDs in Schedule C = ['gig-1099-1', 'gig-1099-2']
- [ ] Tax treatment field is included in raw data exports

---

## Manual Testing Procedure

### Setup Golden Dataset in App

1. **Create W-2 Payer**
   - Name: "Test W-2 Employer"
   - Type: Corporation
   - Tax Treatment: W-2 (Payroll)
   - Employer Name: "Test W-2 Employer LLC"
   - EIN Last 4: 1234

2. **Create 1099 Payer**
   - Name: "Test 1099 Client"
   - Type: Client
   - Tax Treatment: 1099 / Contractor
   - Tax ID Type: EIN
   - Last 4: 5678

3. **Create Gigs**
   - W-2 Gig: $1,000 (date: Jan 15, 2024)
   - 1099 Gig #1: $1,000 (date: Jan 20, 2024)
   - 1099 Gig #2: $500 (date: Jan 25, 2024)

4. **Create Expense**
   - Equipment/Gear: $300 (date: Jan 22, 2024)

### Verify Calculations

1. **Dashboard**
   - Total Income: $2,500 ✓
   - Tax Set-Aside: Based on $1,200 ✓

2. **Run SQL Queries**
   - Execute queries from section above
   - Compare results to expected values

3. **Generate Exports**
   - Generate each export format
   - Verify Schedule C contains only 1099 gigs
   - Verify W-2 appears in separate summary

4. **Test Invariant: Add W-2 Gig**
   - Add another W-2 gig for $5,000
   - Total income should increase to $7,500
   - Schedule C income should remain $1,500
   - Tax set-aside should remain based on $1,200

---

## Automated Verification Script

Run the verification script to check all invariants:

```bash
npm run verify:tax-treatment
```

This script will:
1. Load golden dataset
2. Run calculations
3. Generate exports
4. Verify all invariants
5. Report any violations

---

## Common Issues and Fixes

### Issue: W-2 gigs appearing in Schedule C export

**Diagnosis:**
```sql
-- Find W-2 gigs in Schedule C data
SELECT g.id, g.title, p.name, COALESCE(g.tax_treatment, p.tax_treatment) as treatment
FROM gigs g
JOIN payers p ON g.payer_id = p.id
WHERE COALESCE(g.tax_treatment, p.tax_treatment) = 'w2';
```

**Fix:** Ensure export generator uses `filterGigsForScheduleC()` helper

### Issue: Tax set-aside including W-2 income

**Diagnosis:** Check YTD query in `useGigTaxCalculation.ts`

**Fix:** Ensure query filters by:
```sql
WHERE COALESCE(g.tax_treatment, p.tax_treatment, 'contractor_1099') = 'contractor_1099'
```

### Issue: Totals don't match expected values

**Diagnosis:** Run SQL queries to compare DB vs UI

**Fix:** Verify calculation logic uses canonical helpers from `taxTreatment.ts`

---

## Regression Testing

After any changes to tax treatment logic:

1. Run unit tests: `npm test`
2. Run verification script: `npm run verify:tax-treatment`
3. Manually test with golden dataset
4. Generate all export formats and verify
5. Check SQL queries return expected values

---

## Contact

For questions about tax treatment verification, refer to:
- `TAX_TREATMENT_IMPLEMENTATION.md` - Technical implementation details
- `src/lib/taxTreatment.ts` - Single source of truth for logic
- `src/lib/__tests__/taxTreatment.test.ts` - Unit tests
