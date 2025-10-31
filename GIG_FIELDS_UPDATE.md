# Gig Form Updates - Ready to Apply! 

## 🔧 Action Required FIRST: Run SQL Migration

Before the new fields will work, you need to run this SQL in Supabase:

**Go to**: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/sql/new

**Copy and run this entire SQL**:

```sql
-- Add additional fields to gigs table to match Google Sheet
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS per_diem NUMERIC(12,2) DEFAULT 0;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS other_income NUMERIC(12,2) DEFAULT 0;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS invoice_link TEXT;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT false;
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS taxes_withheld BOOLEAN DEFAULT false;

-- Update the net_amount calculation trigger to include per_diem and other_income
CREATE OR REPLACE FUNCTION calculate_gig_net_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_amount := COALESCE(NEW.gross_amount, 0) 
                  + COALESCE(NEW.tips, 0) 
                  + COALESCE(NEW.per_diem, 0)
                  + COALESCE(NEW.other_income, 0)
                  - COALESCE(NEW.fees, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS set_gig_net_amount ON gigs;
CREATE TRIGGER set_gig_net_amount
  BEFORE INSERT OR UPDATE ON gigs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_gig_net_amount();
```

## ✅ New Fields Added to Gigs

### Location Details
- **City** - Separate city field
- **State** - US state dropdown (OH, MD, etc.)

### Additional Income
- **Per Diem** - Daily allowance
- **Other Income** - Misc income

### Payment Tracking
- **Payment Method** - Direct Deposit, Cash, Venmo, CashApp, Check, Other
- **Invoice Link** - URL to invoice
- **Paid?** - Boolean checkbox
- **Taxes Withheld?** - Boolean checkbox

### Auto-Calculated
- **Net Income** - Now includes: Gross + Tips + Per Diem + Other Income - Fees

## 📝 What's Updated

### Code Files:
- ✅ `src/types/database.types.ts` - Added all new fields
- ✅ `src/lib/validations.ts` - Updated schema
- ✅ `src/hooks/useGigs.ts` - Updated net amount calculation
- ✅ `src/components/AddGigModal.tsx` - Added form state (UI pending)

### Still Need to Add (after SQL migration):
- Form UI fields in AddGigModal
- Display in GigsScreen list
- Update GigsScreen to show new fields

## 🎯 Next Steps

1. **Run the SQL migration above** ⬆️
2. Let me know when it's done
3. I'll finish adding the UI fields to the form
4. Test adding a gig with all the new fields!

## Fields We're NOT Adding (Yet)

These are auto-calculated and will be added to the Dashboard in M5:
- Est. SE Tax
- Est. Fed Income Tax  
- Est. State Tax
- Suggested Tax Set-Aside

These will be calculated based on your gig income and displayed in reports/dashboard.
