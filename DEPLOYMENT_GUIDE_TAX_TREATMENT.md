# Tax Treatment Feature - Deployment Guide

## Pre-Deployment Checklist

### 1. Database Backup
```bash
# Create a backup before running migrations
# Via Supabase Dashboard: Database > Backups > Create backup
```

### 2. Review Migrations
Ensure these migration files are present:
- `supabase/migrations/20260217_add_tax_treatment.sql`
- `supabase/migrations/20260217_backfill_tax_treatment.sql`

## Deployment Steps

### Step 1: Run Database Migrations

**Option A: Supabase CLI (Recommended)**
```bash
cd /Users/johnburkhardt/dev/gigledger
supabase db push
```

**Option B: Supabase Dashboard**
1. Go to SQL Editor in Supabase Dashboard
2. Run `20260217_add_tax_treatment.sql` first
3. Run `20260217_backfill_tax_treatment.sql` second
4. Verify no errors

### Step 2: Verify Database Changes

Run this query to verify:
```sql
-- Check payers table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'payers'
  AND column_name IN ('tax_treatment', 'w2_employer_name', 'w2_employer_ein_last4', 'payroll_provider', 'payroll_contact_email');

-- Check gigs table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'gigs'
  AND column_name IN ('tax_treatment', 'amount_type', 'net_amount_w2', 'withholding_amount');

-- Verify backfill worked
SELECT 
  tax_treatment,
  expect_1099,
  COUNT(*) as count
FROM payers
GROUP BY tax_treatment, expect_1099;
```

Expected results:
- All columns should exist
- Payers should have tax_treatment populated
- expect_1099 should match tax_treatment

### Step 3: Deploy Code Changes

**For Vercel:**
```bash
# Commit changes
git add .
git commit -m "feat: Add W-2 vs 1099 tax treatment support"

# Push to deploy
git push origin main
```

**Verify deployment:**
- Check Vercel dashboard for successful build
- No TypeScript errors
- No build failures

### Step 4: Smoke Testing

#### Test 1: Existing Payers Load
1. Navigate to Payers list
2. Verify all existing payers display correctly
3. Open an existing payer for edit
4. Verify tax_treatment is set (should be 'contractor_1099' or 'other')

#### Test 2: Create W-2 Payer
1. Click "Add Payer"
2. Enter name: "Test W-2 Employer"
3. Select "W-2 (Payroll)" tax treatment
4. Expand "W-2 Details (Optional)"
5. Enter employer name, EIN last 4
6. Save
7. Verify payer created successfully

#### Test 3: Create 1099 Payer
1. Click "Add Payer"
2. Enter name: "Test 1099 Client"
3. Select "1099 / Contractor" tax treatment
4. Enter Tax ID Type (SSN or EIN)
5. Enter last 4 digits
6. Save
7. Verify payer created successfully

#### Test 4: Tax Calculation Excludes W-2
1. Create a gig with W-2 payer
2. Enter amount: $1000
3. Check tax set-aside calculation
4. Verify it shows $0 or is excluded
5. Create a gig with 1099 payer
6. Enter amount: $1000
7. Verify tax set-aside calculates normally

#### Test 5: Dashboard Totals
1. Navigate to Dashboard
2. Verify YTD income shows correctly
3. Verify tax set-aside excludes W-2 gigs
4. Check that total income includes both W-2 and 1099

### Step 5: Data Validation

Run these queries to verify data integrity:

```sql
-- Check for any NULL tax_treatments on payers (should be 0)
SELECT COUNT(*) FROM payers WHERE tax_treatment IS NULL;

-- Check gigs have valid tax_treatment (NULL is OK, means inherit)
SELECT 
  COALESCE(g.tax_treatment, p.tax_treatment, 'contractor_1099') as effective_treatment,
  COUNT(*) as count
FROM gigs g
LEFT JOIN payers p ON g.payer_id = p.id
GROUP BY effective_treatment;

-- Verify expect_1099 sync
SELECT 
  tax_treatment,
  expect_1099,
  COUNT(*) as count
FROM payers
GROUP BY tax_treatment, expect_1099
HAVING (tax_treatment = 'contractor_1099' AND expect_1099 != true)
    OR (tax_treatment != 'contractor_1099' AND expect_1099 = true);
-- Should return 0 rows (all in sync)
```

## Rollback Plan

If issues occur, rollback with these steps:

### 1. Revert Code
```bash
git revert HEAD
git push origin main
```

### 2. Rollback Database (if needed)
```sql
-- Remove new columns from gigs
ALTER TABLE gigs DROP COLUMN IF EXISTS tax_treatment;
ALTER TABLE gigs DROP COLUMN IF EXISTS amount_type;
ALTER TABLE gigs DROP COLUMN IF EXISTS net_amount_w2;
ALTER TABLE gigs DROP COLUMN IF EXISTS withholding_amount;

-- Remove new columns from payers
ALTER TABLE payers DROP COLUMN IF EXISTS tax_treatment;
ALTER TABLE payers DROP COLUMN IF EXISTS w2_employer_name;
ALTER TABLE payers DROP COLUMN IF EXISTS w2_employer_ein_last4;
ALTER TABLE payers DROP COLUMN IF EXISTS payroll_provider;
ALTER TABLE payers DROP COLUMN IF EXISTS payroll_contact_email;

-- Drop trigger
DROP TRIGGER IF EXISTS sync_payer_expect_1099 ON payers;
DROP FUNCTION IF EXISTS sync_expect_1099();

-- Drop helper function
DROP FUNCTION IF EXISTS get_effective_tax_treatment(TEXT, TEXT);

-- Drop view
DROP VIEW IF EXISTS gigs_with_tax_treatment;
```

### 3. Restore from Backup
If rollback SQL fails, restore from the backup created in Step 1.

## Post-Deployment Monitoring

### Metrics to Watch
1. **Error Rate**: Check for increased errors in logs
2. **Payer Creation**: Verify users can create payers
3. **Gig Creation**: Verify users can create gigs
4. **Tax Calculations**: Spot-check tax set-aside amounts

### Common Issues

**Issue: "Column does not exist" errors**
- Cause: Migrations didn't run
- Fix: Run migrations manually via SQL Editor

**Issue: Tax set-aside showing incorrect amounts**
- Cause: YTD query not excluding W-2 gigs
- Fix: Verify code deployment succeeded

**Issue: Payer form not showing tax treatment options**
- Cause: Frontend code not deployed
- Fix: Check Vercel deployment logs

**Issue: expect_1099 out of sync**
- Cause: Trigger not created
- Fix: Run backfill migration again

## Support Queries

### Find W-2 Gigs
```sql
SELECT 
  g.id,
  g.date,
  g.title,
  g.gross_amount,
  p.name as payer_name,
  COALESCE(g.tax_treatment, p.tax_treatment) as effective_treatment
FROM gigs g
JOIN payers p ON g.payer_id = p.id
WHERE COALESCE(g.tax_treatment, p.tax_treatment) = 'w2'
ORDER BY g.date DESC;
```

### Find Payers by Tax Treatment
```sql
SELECT 
  tax_treatment,
  COUNT(*) as count,
  ARRAY_AGG(name ORDER BY name) as payer_names
FROM payers
GROUP BY tax_treatment;
```

### Verify Tax Set-Aside Exclusion
```sql
-- YTD income by treatment type
SELECT 
  COALESCE(g.tax_treatment, p.tax_treatment, 'contractor_1099') as treatment,
  COUNT(*) as gig_count,
  SUM(g.gross_amount + COALESCE(g.tips, 0) + COALESCE(g.per_diem, 0) + COALESCE(g.other_income, 0) - COALESCE(g.fees, 0)) as total_income
FROM gigs g
LEFT JOIN payers p ON g.payer_id = p.id
WHERE g.date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY treatment;
```

## Success Criteria

Deployment is successful when:
- ✅ All migrations run without errors
- ✅ Existing payers and gigs load correctly
- ✅ New payers can be created with W-2 or 1099 treatment
- ✅ Tax calculations exclude W-2 gigs
- ✅ No increase in error rate
- ✅ expect_1099 field stays in sync
- ✅ All smoke tests pass

## Timeline

- **Migrations**: 1-2 minutes
- **Code Deployment**: 3-5 minutes (Vercel build)
- **Smoke Testing**: 10-15 minutes
- **Total**: ~20 minutes

## Contact

For issues during deployment:
- Check implementation docs: `TAX_TREATMENT_IMPLEMENTATION.md`
- Review migration files for SQL details
- Check Vercel logs for frontend errors
- Check Supabase logs for database errors
