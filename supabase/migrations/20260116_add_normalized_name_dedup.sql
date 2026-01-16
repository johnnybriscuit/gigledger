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
