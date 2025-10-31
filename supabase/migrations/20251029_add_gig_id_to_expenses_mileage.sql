-- Add gig_id column to expenses and mileage tables for inline gig-related items
-- This allows expenses and mileage to be associated with specific gigs

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

-- Note: gig_id is optional (nullable) to support both:
-- 1. Standalone expenses/mileage (existing behavior)
-- 2. Gig-specific expenses/mileage (new inline feature)
