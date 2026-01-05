-- Update expense_category enum to match new category names
-- This requires recreating the enum with new values

-- Step 1: Drop the view that depends on the category column
DROP VIEW IF EXISTS v_expenses_export;

-- Step 2: Add new enum type with updated values
CREATE TYPE expense_category_new AS ENUM (
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
);

-- Step 3: Alter the column to use text temporarily
ALTER TABLE expenses 
  ALTER COLUMN category TYPE text 
  USING category::text;

-- Step 4: Update existing data to map old categories to new ones
UPDATE expenses SET category = 
  CASE 
    WHEN category = 'Meals' THEN 'Meals & Entertainment'
    WHEN category = 'Equipment' THEN 'Equipment/Gear'
    WHEN category = 'Software' THEN 'Software/Subscriptions'
    WHEN category = 'Marketing' THEN 'Marketing/Promotion'
    WHEN category = 'Fees' THEN 'Professional Fees'
    WHEN category = 'Education' THEN 'Education/Training'
    WHEN category = 'Rent' THEN 'Rent/Studio'
    WHEN category = 'Travel' THEN 'Travel'
    WHEN category = 'Lodging' THEN 'Lodging'
    WHEN category = 'Supplies' THEN 'Supplies'
    WHEN category = 'Other' THEN 'Other'
    ELSE 'Other'
  END;

-- Step 5: Alter the column to use the new enum type
ALTER TABLE expenses 
  ALTER COLUMN category TYPE expense_category_new 
  USING category::expense_category_new;

-- Step 6: Drop the old enum and rename the new one
DROP TYPE expense_category;
ALTER TYPE expense_category_new RENAME TO expense_category;

-- Step 7: Recreate the v_expenses_export view
CREATE OR REPLACE VIEW v_expenses_export AS
SELECT 
  e.user_id,
  e.date,
  e.category,
  e.vendor,
  e.description,
  e.amount,
  e.receipt_url,
  e.notes,
  e.recurring_expense_id
FROM expenses e
ORDER BY e.date DESC;

-- RLS policy for expenses export view
ALTER VIEW v_expenses_export SET (security_invoker = on);

-- Add comment
COMMENT ON TYPE expense_category IS 'Updated expense categories for better tax deduction tracking';
