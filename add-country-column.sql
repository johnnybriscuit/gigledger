-- Add country column to gigs table
ALTER TABLE gigs
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';

-- Add comment
COMMENT ON COLUMN gigs.country IS 'Country code (e.g., US, CA, UK)';
