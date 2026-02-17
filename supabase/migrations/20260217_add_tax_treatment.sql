-- Add tax_treatment support for W-2 vs 1099 tracking
-- Part 1: Add columns to payers table

-- Add tax_treatment column to payers
ALTER TABLE payers ADD COLUMN IF NOT EXISTS tax_treatment TEXT NOT NULL DEFAULT 'contractor_1099';

-- Add CHECK constraint for tax_treatment values
ALTER TABLE payers DROP CONSTRAINT IF EXISTS payers_tax_treatment_check;
ALTER TABLE payers ADD CONSTRAINT payers_tax_treatment_check 
  CHECK (tax_treatment IN ('w2', 'contractor_1099', 'other'));

-- Add W-2 specific fields to payers (all nullable)
ALTER TABLE payers ADD COLUMN IF NOT EXISTS w2_employer_name TEXT;
ALTER TABLE payers ADD COLUMN IF NOT EXISTS w2_employer_ein_last4 TEXT;
ALTER TABLE payers ADD COLUMN IF NOT EXISTS payroll_provider TEXT;
ALTER TABLE payers ADD COLUMN IF NOT EXISTS payroll_contact_email TEXT;

-- Add CHECK constraint for EIN last4 (must be exactly 4 numeric digits if present)
ALTER TABLE payers DROP CONSTRAINT IF EXISTS payers_w2_ein_last4_check;
ALTER TABLE payers ADD CONSTRAINT payers_w2_ein_last4_check 
  CHECK (w2_employer_ein_last4 IS NULL OR (w2_employer_ein_last4 ~ '^[0-9]{4}$'));

-- Part 2: Add columns to gigs table

-- Add tax_treatment column to gigs (nullable - NULL means inherit from payer)
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS tax_treatment TEXT;

-- Add CHECK constraint for gigs tax_treatment values
ALTER TABLE gigs DROP CONSTRAINT IF EXISTS gigs_tax_treatment_check;
ALTER TABLE gigs ADD CONSTRAINT gigs_tax_treatment_check 
  CHECK (tax_treatment IS NULL OR tax_treatment IN ('w2', 'contractor_1099', 'other'));

-- Add amount_type column to gigs (gross vs net)
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS amount_type TEXT NOT NULL DEFAULT 'gross';

-- Add CHECK constraint for amount_type
ALTER TABLE gigs DROP CONSTRAINT IF EXISTS gigs_amount_type_check;
ALTER TABLE gigs ADD CONSTRAINT gigs_amount_type_check 
  CHECK (amount_type IN ('gross', 'net'));

-- Add new amount columns to gigs (nullable - we keep existing gross_amount)
-- Note: existing gross_amount column remains as-is for backward compatibility
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS net_amount_w2 NUMERIC(12,2);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS withholding_amount NUMERIC(12,2);

-- Part 3: Create helper function for effective tax treatment

-- Function to get effective tax treatment for a gig
CREATE OR REPLACE FUNCTION get_effective_tax_treatment(
  gig_tax_treatment TEXT,
  payer_tax_treatment TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(gig_tax_treatment, payer_tax_treatment, 'contractor_1099');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Part 4: Create view for gigs with effective tax treatment

CREATE OR REPLACE VIEW gigs_with_tax_treatment AS
SELECT 
  g.*,
  p.tax_treatment as payer_tax_treatment,
  get_effective_tax_treatment(g.tax_treatment, p.tax_treatment) as effective_tax_treatment
FROM gigs g
LEFT JOIN payers p ON g.payer_id = p.id;

-- Part 5: Add indexes for performance

CREATE INDEX IF NOT EXISTS idx_payers_tax_treatment ON payers(tax_treatment);
CREATE INDEX IF NOT EXISTS idx_gigs_tax_treatment ON gigs(tax_treatment);

-- Part 6: Add comments for documentation

COMMENT ON COLUMN payers.tax_treatment IS 'Tax treatment type: w2, contractor_1099, or other';
COMMENT ON COLUMN payers.w2_employer_name IS 'W-2 employer name (optional, for W-2 payers)';
COMMENT ON COLUMN payers.w2_employer_ein_last4 IS 'Last 4 digits of employer EIN (optional, for W-2 payers)';
COMMENT ON COLUMN payers.payroll_provider IS 'Payroll provider name (optional, for W-2 payers)';
COMMENT ON COLUMN payers.payroll_contact_email IS 'Payroll contact email (optional, for W-2 payers)';

COMMENT ON COLUMN gigs.tax_treatment IS 'Tax treatment override for this gig (NULL = inherit from payer)';
COMMENT ON COLUMN gigs.amount_type IS 'Whether amount represents gross or net pay';
COMMENT ON COLUMN gigs.net_amount_w2 IS 'Net amount received after withholding (for W-2 gigs)';
COMMENT ON COLUMN gigs.withholding_amount IS 'Amount withheld for taxes (for W-2 gigs)';
