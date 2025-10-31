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

-- Note: Run this in your Supabase SQL Editor
