-- Backfill tax_treatment for existing payers and gigs
-- This migration ensures backward compatibility with existing data

-- Part 1: Backfill payers.tax_treatment based on legacy expect_1099 field

UPDATE payers
SET tax_treatment = CASE
  WHEN expect_1099 = true THEN 'contractor_1099'
  ELSE 'other'
END
WHERE tax_treatment = 'contractor_1099' -- Only update default values
  AND expect_1099 IS NOT NULL;

-- Part 2: Backfill gigs.tax_treatment from their payer's tax_treatment
-- This sets the tax_treatment explicitly for existing gigs based on their payer

UPDATE gigs g
SET tax_treatment = p.tax_treatment
FROM payers p
WHERE g.payer_id = p.id
  AND g.tax_treatment IS NULL;

-- Part 3: Set amount_type based on effective tax treatment
-- W-2 gigs default to 'net', contractor gigs default to 'gross'

UPDATE gigs g
SET amount_type = CASE
  WHEN get_effective_tax_treatment(g.tax_treatment, p.tax_treatment) = 'w2' THEN 'net'
  ELSE 'gross'
END
FROM payers p
WHERE g.payer_id = p.id
  AND g.amount_type = 'gross'; -- Only update default values

-- Part 4: For existing gigs, ensure backward compatibility
-- The existing gross_amount column is the primary amount field
-- We don't need to populate net_amount_w2 for existing gigs unless they're W-2

-- No action needed here - existing gigs will continue to use gross_amount
-- New W-2 gigs will use net_amount_w2 when appropriate

-- Part 5: Keep expect_1099 in sync with tax_treatment for backward compatibility
-- This ensures existing code that reads expect_1099 continues to work

CREATE OR REPLACE FUNCTION sync_expect_1099()
RETURNS TRIGGER AS $$
BEGIN
  -- Update expect_1099 based on tax_treatment
  NEW.expect_1099 := (NEW.tax_treatment = 'contractor_1099');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep expect_1099 in sync
DROP TRIGGER IF EXISTS sync_payer_expect_1099 ON payers;
CREATE TRIGGER sync_payer_expect_1099
  BEFORE INSERT OR UPDATE OF tax_treatment ON payers
  FOR EACH ROW
  EXECUTE FUNCTION sync_expect_1099();

-- Backfill expect_1099 for all existing payers
UPDATE payers
SET expect_1099 = (tax_treatment = 'contractor_1099')
WHERE expect_1099 IS NULL OR expect_1099 != (tax_treatment = 'contractor_1099');
