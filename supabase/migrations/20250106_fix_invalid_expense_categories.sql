-- Fix invalid expense categories in the database
-- This migration cleans up any rows with invalid category values

-- Step 1: Identify and fix any invalid categories
-- Convert category to text temporarily to allow updates
ALTER TABLE expenses 
  ALTER COLUMN category TYPE text;

-- Update any invalid categories to valid enum values
UPDATE expenses 
SET category = CASE
  WHEN category = 'Meals' THEN 'Meals & Entertainment'
  WHEN category = 'Equipment' THEN 'Equipment/Gear'
  WHEN category = 'Software' THEN 'Software/Subscriptions'
  WHEN category = 'Marketing' THEN 'Marketing/Promotion'
  WHEN category = 'Fees' THEN 'Professional Fees'
  WHEN category = 'Education' THEN 'Education/Training'
  WHEN category = 'Rent' THEN 'Rent/Studio'
  -- If category is not in the valid list, default to 'Other'
  WHEN category NOT IN (
    'Meals & Entertainment',
    'Travel',
    'Lodging',
    'Equipment/Gear',
    'Supplies',
    'Software/Subscriptions',
    'Marketing/Promotion',
    'Professional Fees',
    'Education/Training',
    'Rent/Studio',
    'Other'
  ) THEN 'Other'
  ELSE category
END;

-- Step 2: Convert back to enum type
ALTER TABLE expenses 
  ALTER COLUMN category TYPE expense_category
  USING category::expense_category;

-- Step 3: Add a comment documenting the valid values
COMMENT ON TYPE expense_category IS 'Valid expense categories: Meals & Entertainment, Travel, Lodging, Equipment/Gear, Supplies, Software/Subscriptions, Marketing/Promotion, Professional Fees, Education/Training, Rent/Studio, Other';
