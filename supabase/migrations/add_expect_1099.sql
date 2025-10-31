-- Add expect_1099 field to payers table
ALTER TABLE payers ADD COLUMN IF NOT EXISTS expect_1099 BOOLEAN DEFAULT false;

-- Update the payer_type enum to include Individual and Corporation
-- First, add the new values
ALTER TYPE payer_type ADD VALUE IF NOT EXISTS 'Individual';
ALTER TYPE payer_type ADD VALUE IF NOT EXISTS 'Corporation';

-- Note: To run this migration, execute it in your Supabase SQL Editor
