-- Fix payer_type to have a default value for CSV imports
-- This migration is separate because the previous migration was already applied

-- Add default value for payer_type column
ALTER TABLE payers ALTER COLUMN payer_type SET DEFAULT 'Venue';

-- Note: Existing code explicitly sets payer_type on insert as a backstop
