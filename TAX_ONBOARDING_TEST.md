# 🧪 Tax Profile Onboarding - Quick Test

## ✅ What's Ready

The tax profile onboarding modal is now integrated! It will automatically show when a user doesn't have a tax profile.

## 🚀 How to Test

### Step 1: Start the App
```bash
npm start
# Press 'w' for web
```

### Step 2: Test the Onboarding

The modal should automatically appear when you load the dashboard (if you don't have a tax profile yet).

**If it doesn't appear**, it means you already have a tax profile. To test it:

#### Option A: Delete Your Tax Profile (Recommended for Testing)
Run this in Supabase SQL Editor:
```sql
DELETE FROM user_tax_profile WHERE user_id = auth.uid();
```

Then refresh the app - the onboarding should appear!

#### Option B: Test with a New Account
1. Sign out
2. Create a new test account
3. The onboarding will appear on first dashboard load

### Step 3: Go Through the Onboarding

**Step 1: Filing Status**
- Select: Single, Married Filing Jointly, Married Filing Separately, or Head of Household
- Click Continue

**Step 2: State**
- Select your state: TN, TX, CA, NY, or MD
- Note: TN and TX show "No state income tax"
- Click Continue

**Step 3: Local Tax Info**
- **If MD**: Select your county from the dropdown
- **If NY**: Check boxes for NYC resident and/or Yonkers resident
- **If TN/TX/CA**: Just says "No additional info needed"
- Click Continue

**Step 4: Deduction Method**
- Select Standard or Itemized
- If Itemized: Enter estimated amount
- Click Complete Setup

### Step 4: Verify It Saved

After completing, check in Supabase:
```sql
SELECT * FROM user_tax_profile WHERE user_id = auth.uid();
```

You should see your profile with all the fields you entered!

---

## 🎨 What You'll See

### Beautiful 4-Step Modal
- Progress dots at the top
- Clean, mobile-friendly design
- State-conditional UI (county picker for MD, NYC/Yonkers for NY)
- Validation (can't proceed without required fields)
- Back/Continue buttons

### State-Specific Features
- **Maryland**: County dropdown with all 24 counties
- **New York**: Checkboxes for NYC resident and Yonkers resident
- **Tennessee/Texas**: "No state income tax" message
- **California**: Standard flow (millionaire surtax calculated automatically)

---

## 🐛 Troubleshooting

### Modal doesn't appear
- Check: Do you already have a tax profile?
- Run: `SELECT * FROM user_tax_profile WHERE user_id = auth.uid();`
- If yes: Delete it to test again

### "Table doesn't exist" error
- Run the migration: `supabase/migrations/20251103_create_tax_profile.sql`
- In Supabase SQL Editor

### Modal appears but won't save
- Check browser console for errors
- Verify Supabase connection
- Check RLS policies are enabled

---

## ✨ What Happens Next

After you complete the onboarding:
1. ✅ Your tax profile is saved to Supabase
2. ✅ Modal won't show again (you have a profile now)
3. ⏳ Ready for: Set-aside calculations in Add Gig modal
4. ⏳ Ready for: Dashboard tax rate cards

---

## 🎯 Next Steps (After Testing)

Once you've tested and confirmed it works:

### Option 1: Add Set-Aside to Add Gig Modal (20 min)
Show "Set Aside: $X • Y%" when adding a gig

### Option 2: Add Dashboard Tax Cards (20 min)
Show YTD effective tax rate and recommended set-aside

### Option 3: Both! (40 min)
Complete the full integration

---

## 📝 Test Scenarios

### Scenario 1: Tennessee Musician
- Filing: Single
- State: TN
- Expected: Quick flow (no county, no local tax)

### Scenario 2: NYC Musician
- Filing: Single
- State: NY
- NYC Resident: Yes
- Expected: NYC checkbox appears and can be checked

### Scenario 3: Maryland with County
- Filing: Married Filing Jointly
- State: MD
- County: Baltimore City
- Expected: County dropdown appears with all counties

### Scenario 4: California High Earner
- Filing: Single
- State: CA
- Deduction: Itemized ($30,000)
- Expected: Itemized amount field appears

---

**Ready to test?** Start the app and see the onboarding modal! 🎉

Let me know if you see any issues or if you're ready to proceed with the full integration!
