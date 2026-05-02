-- Add country field to gigs table
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'US';

-- Add comment to explain the field
COMMENT ON COLUMN gigs.country IS 'ISO 3166-1 alpha-2 country code (e.g., US, CA, GB)';
