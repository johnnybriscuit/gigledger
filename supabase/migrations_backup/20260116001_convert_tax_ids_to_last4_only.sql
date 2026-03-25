-- Convert tax IDs to last-4 only for security
-- Never store full SSN/EIN - only last 4 digits

-- Add new columns to payers table
ALTER TABLE payers
ADD COLUMN IF NOT EXISTS tax_id_type TEXT CHECK (tax_id_type IN ('ssn', 'ein'));

ALTER TABLE payers
ADD COLUMN IF NOT EXISTS tax_id_last4 TEXT CHECK (length(tax_id_last4) = 4 AND tax_id_last4 ~ '^[0-9]+$');

-- Migrate existing full tax_id values to last4
-- Extract last 4 digits from existing tax_id field
UPDATE payers
SET tax_id_last4 = right(regexp_replace(tax_id, '[^0-9]', '', 'g'), 4)
WHERE tax_id IS NOT NULL 
  AND tax_id != ''
  AND length(regexp_replace(tax_id, '[^0-9]', '', 'g')) >= 4
  AND tax_id_last4 IS NULL;

-- Clear the full tax_id field for security
-- We're removing full IDs permanently
UPDATE payers
SET tax_id = NULL
WHERE tax_id IS NOT NULL AND tax_id != '';

-- Add comment explaining the security change
COMMENT ON COLUMN payers.tax_id IS 'DEPRECATED: Use tax_id_last4 instead. Full IDs should never be stored.';
COMMENT ON COLUMN payers.tax_id_type IS 'Type of tax ID: ssn or ein. For 1099 reporting.';
COMMENT ON COLUMN payers.tax_id_last4 IS 'Last 4 digits of SSN/EIN only. Never store full tax IDs.';

-- Note: We keep the tax_id column for backward compatibility but it should always be NULL
-- Future: Can drop tax_id column in a later migration after confirming no dependencies
