-- Add normalized_name columns and unique constraints for contact de-duplication
-- Prevents duplicate contacts with same name (case-insensitive)

-- Add normalized_name to payers
ALTER TABLE payers
ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- Add normalized_name to subcontractors
ALTER TABLE subcontractors
ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- Backfill normalized_name for existing payers
UPDATE payers
SET normalized_name = lower(trim(name))
WHERE normalized_name IS NULL;

-- Backfill normalized_name for existing subcontractors
UPDATE subcontractors
SET normalized_name = lower(trim(name))
WHERE normalized_name IS NULL;

-- Handle existing duplicates in payers
-- Step 1: Update gigs to point to the keeper payer (highest ID for each duplicate set)
UPDATE gigs g
SET payer_id = (
  SELECT p2.id
  FROM payers p2
  WHERE p2.user_id = (SELECT user_id FROM payers WHERE id = g.payer_id)
    AND p2.normalized_name = (SELECT normalized_name FROM payers WHERE id = g.payer_id)
  ORDER BY p2.id DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM payers p1, payers p2
  WHERE p1.id = g.payer_id
    AND p1.user_id = p2.user_id
    AND p1.normalized_name = p2.normalized_name
    AND p1.id < p2.id
);

-- Step 2: Delete duplicate payers (keep the one with highest ID)
DELETE FROM payers p1
USING payers p2
WHERE p1.user_id = p2.user_id
  AND p1.normalized_name = p2.normalized_name
  AND p1.id < p2.id;

-- Handle existing duplicates in subcontractors
-- Step 1: Update gig_subcontractor_payments to point to the keeper subcontractor
UPDATE gig_subcontractor_payments gsp
SET subcontractor_id = (
  SELECT s2.id
  FROM subcontractors s2
  WHERE s2.user_id = (SELECT user_id FROM subcontractors WHERE id = gsp.subcontractor_id)
    AND s2.normalized_name = (SELECT normalized_name FROM subcontractors WHERE id = gsp.subcontractor_id)
  ORDER BY s2.id DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM subcontractors s1, subcontractors s2
  WHERE s1.id = gsp.subcontractor_id
    AND s1.user_id = s2.user_id
    AND s1.normalized_name = s2.normalized_name
    AND s1.id < s2.id
);

-- Step 2: Delete duplicate subcontractors (keep the one with highest ID)
DELETE FROM subcontractors s1
USING subcontractors s2
WHERE s1.user_id = s2.user_id
  AND s1.normalized_name = s2.normalized_name
  AND s1.id < s2.id;

-- Make normalized_name NOT NULL after backfill
ALTER TABLE payers
ALTER COLUMN normalized_name SET NOT NULL;

ALTER TABLE subcontractors
ALTER COLUMN normalized_name SET NOT NULL;

-- Add unique constraint on (user_id, normalized_name) for payers
-- This prevents duplicates like "Johnny brisket" and "Johnny Brisket"
CREATE UNIQUE INDEX IF NOT EXISTS payers_user_id_normalized_name_unique
ON payers(user_id, normalized_name);

-- Add unique constraint on (user_id, normalized_name) for subcontractors
CREATE UNIQUE INDEX IF NOT EXISTS subcontractors_user_id_normalized_name_unique
ON subcontractors(user_id, normalized_name);

-- Add function to automatically set normalized_name on insert/update for payers
CREATE OR REPLACE FUNCTION set_payers_normalized_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name = lower(trim(NEW.name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add function to automatically set normalized_name on insert/update for subcontractors
CREATE OR REPLACE FUNCTION set_subcontractors_normalized_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name = lower(trim(NEW.name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for payers
DROP TRIGGER IF EXISTS payers_set_normalized_name ON payers;
CREATE TRIGGER payers_set_normalized_name
  BEFORE INSERT OR UPDATE OF name ON payers
  FOR EACH ROW
  EXECUTE FUNCTION set_payers_normalized_name();

-- Create triggers for subcontractors
DROP TRIGGER IF EXISTS subcontractors_set_normalized_name ON subcontractors;
CREATE TRIGGER subcontractors_set_normalized_name
  BEFORE INSERT OR UPDATE OF name ON subcontractors
  FOR EACH ROW
  EXECUTE FUNCTION set_subcontractors_normalized_name();

-- Add comments
COMMENT ON COLUMN payers.normalized_name IS 'Lowercase trimmed name for case-insensitive matching and de-duplication';
COMMENT ON COLUMN subcontractors.normalized_name IS 'Lowercase trimmed name for case-insensitive matching and de-duplication';
