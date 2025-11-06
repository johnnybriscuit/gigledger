-- Add gig_id column to expenses and mileage tables for inline gig-related items
-- This allows expenses and mileage to be associated with specific gigs
-- Run this in your Supabase SQL Editor

-- Add gig_id to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE;

-- Add gig_id to mileage table  
ALTER TABLE mileage
ADD COLUMN IF NOT EXISTS gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE;

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_gig_id ON expenses(gig_id);
CREATE INDEX IF NOT EXISTS idx_mileage_gig_id ON mileage(gig_id);

-- Add comments
COMMENT ON COLUMN expenses.gig_id IS 'Optional reference to gig if this expense was incurred for a specific gig';
COMMENT ON COLUMN mileage.gig_id IS 'Optional reference to gig if this mileage was for a specific gig';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses' AND column_name = 'gig_id';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mileage' AND column_name = 'gig_id';
