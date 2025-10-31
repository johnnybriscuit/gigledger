# Testing the Tax Withholding System

## Step 1: Run Database Migration

**IMPORTANT: Do this first!**

1. Open your Supabase Dashboard: https://app.supabase.com
2. Select your GigLedger project
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/20250120_add_tax_withholding_tables.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. You should see: "Success. No rows returned"

### Verify Migration Worked:

Run this query to check:
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('state_tax_rates', 'profiles');

-- Check if state rates were seeded
SELECT state_code, type, flat_rate, notes 
FROM state_tax_rates 
WHERE state_code IN ('TN', 'CA', 'MD', 'NY')
ORDER BY state_code;

-- Check if profile columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('state_code', 'filing_status');
```

You should see:
- Both tables exist
- 16 state rates (TN, FL, TX, WA, NV, SD, WY, AK, MD, IL, PA, CO, CA, NY, GA)
- Profile has state_code and filing_status columns

---

## Step 2: Add Environment Variables

1. Create/update `.env` file in project root:
```bash
# Add these lines (keep your existing Supabase vars)
EXPO_PUBLIC_TAX_YEAR=2025
EXPO_PUBLIC_FEDERAL_FLAT_RATE_SINGLE=0.12
EXPO_PUBLIC_FEDERAL_FLAT_RATE_MARRIED=0.12
EXPO_PUBLIC_FEDERAL_FLAT_RATE_HOH=0.12
EXPO_PUBLIC_USE_FEDERAL_BRACKETS=false
```

2. Restart your dev server:
```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
# or
yarn start
```

---

## Step 3: Update Your Tax Profile (No Re-signup Needed!)

You can update your existing profile directly in Supabase:

### Option A: Using Supabase Dashboard (Easiest)
1. Go to **Table Editor** → **profiles**
2. Find your user row (search by your email or id)
3. Click to edit the row
4. Set `state_code` to `'TN'` (or any state you want to test)
5. Set `filing_status` to `'single'`
6. Click **Save**

### Option B: Using SQL
```sql
-- Replace 'your-user-id' with your actual user ID
-- You can find it in the profiles table or auth.users table
UPDATE profiles
SET 
  state_code = 'TN',
  filing_status = 'single'
WHERE id = 'your-user-id';
```

---

## Step 4: Test the Withholding Card

1. **Refresh your app** (reload the browser or restart the app)
2. Click **"Add New Gig"**
3. Fill in:
   - Payer: (select any)
   - Date: (any date)
   - Title: "Test Gig"
   - **Gross Amount: 1000**
4. Scroll down past the "Net Amount" card
5. You should see a **yellow/amber card** titled "💰 Recommended Set-Aside"

### Expected Results for $1000 gig with TN (no state tax):

```
💰 Recommended Set-Aside
$261.30

Federal (est.): $120.00
SE Tax (est.): $141.30
State (est.): $0.00

Estimates only. Not tax advice.
```

**Math breakdown:**
- Federal: $1000 × 12% = $120
- SE Tax: $1000 × 92.35% × 15.3% = $141.30
- State (TN): $1000 × 0% = $0
- **Total: $261.30**

---

## Step 5: Test Different States

### Test CA (Progressive Brackets):
```sql
UPDATE profiles
SET state_code = 'CA'
WHERE id = 'your-user-id';
```

Refresh app, create $1000 gig:
- State tax should be: **$10.00** (1% of first $10k bracket)

### Test MD (Flat Rate):
```sql
UPDATE profiles
SET state_code = 'MD'
WHERE id = 'your-user-id';
```

Refresh app, create $1000 gig:
- State tax should be: **$47.50** (4.75% flat rate)

---

## Step 6: Test Live Updates

1. In the "Add New Gig" form
2. Start typing in **Gross Amount**
3. Watch the withholding card **update in real-time** as you type
4. Try: 500, 1000, 2000, 5000
5. The total should change immediately

---

## Step 7: Test Without Tax Profile

To test the "Setup Tax Info" button:

```sql
-- Clear your tax profile
UPDATE profiles
SET 
  state_code = NULL,
  filing_status = 'single'
WHERE id = 'your-user-id';
```

Refresh app:
- You should see a **"Setup Tax Info"** button in the withholding card
- It will default to TN (0% state tax) for calculations

---

## Troubleshooting

### Card Not Showing?
**Check:**
1. Did you enter a Gross Amount > 0?
2. Open browser console (F12) - any errors?
3. Check that migration ran successfully
4. Verify env variables are set and server was restarted

### Wrong Tax Amount?
**Check:**
1. Verify state_code in your profile matches what you expect
2. Check the state rate in database:
   ```sql
   SELECT * FROM state_tax_rates WHERE state_code = 'TN';
   ```
3. Make sure you refreshed the app after changing profile

### TypeScript Errors?
**Solution:**
The database types need to be regenerated. For now, you can ignore the TypeScript error about `net_amount` - it's a known issue that doesn't affect functionality. The hooks calculate it automatically.

---

## Quick Test Checklist

- [ ] Migration ran successfully
- [ ] Environment variables added
- [ ] Dev server restarted
- [ ] Profile updated with state_code and filing_status
- [ ] App refreshed
- [ ] Withholding card appears in Add Gig form
- [ ] Card shows correct amounts for TN ($0 state tax)
- [ ] Card updates live when changing gross amount
- [ ] Tested CA state (shows non-zero state tax)
- [ ] Tested MD state (shows flat rate)

---

## What to Test Next

1. **Create a full gig** with withholding info
2. **Check the gig list** - verify the "Tax to set aside" shows on each gig
3. **Check the dashboard** - verify the tax section shows totals
4. **Test the onboarding screen** (optional) - navigate to it manually

---

## Need Help?

If something isn't working:
1. Check browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify migration ran completely
4. Make sure .env variables are loaded (restart server)
