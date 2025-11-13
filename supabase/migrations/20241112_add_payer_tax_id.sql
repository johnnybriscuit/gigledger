-- Add tax_id field to payers table for EIN/SSN
-- This is needed for 1099 reconciliation

ALTER TABLE payers ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN payers.tax_id IS 'Payer EIN or SSN for 1099 reconciliation';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added tax_id column to payers table';
    RAISE NOTICE '   - This field stores EIN/SSN for 1099 reconciliation';
END $$;
