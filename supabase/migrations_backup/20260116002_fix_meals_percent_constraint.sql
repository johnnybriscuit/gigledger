-- Fix meals_percent_allowed constraint to ensure proper validation
-- This migration ensures the constraint exists and is properly named

-- Drop existing constraint if it exists (it may have been created inline)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'expenses_meals_percent_allowed_check'
  ) THEN
    ALTER TABLE expenses DROP CONSTRAINT expenses_meals_percent_allowed_check;
  END IF;
END $$;

-- Add the constraint with explicit name
ALTER TABLE expenses
ADD CONSTRAINT expenses_meals_percent_allowed_check 
CHECK (meals_percent_allowed IS NULL OR (meals_percent_allowed >= 0 AND meals_percent_allowed <= 1));

-- Update any invalid values (should be 0.5 or 1.0, not 50 or 100)
-- This fixes any data that may have been inserted with wrong values
UPDATE expenses
SET meals_percent_allowed = CASE
  WHEN meals_percent_allowed > 1 AND meals_percent_allowed <= 100 THEN meals_percent_allowed / 100
  ELSE meals_percent_allowed
END
WHERE meals_percent_allowed IS NOT NULL;

-- Set default value for Meals & Entertainment category if NULL
UPDATE expenses
SET meals_percent_allowed = 0.5
WHERE category = 'Meals & Entertainment'
  AND meals_percent_allowed IS NULL;

-- Add comment
COMMENT ON CONSTRAINT expenses_meals_percent_allowed_check ON expenses IS 
'Ensures meals_percent_allowed is between 0 and 1 (e.g., 0.5 = 50%, 1.0 = 100%) or NULL for non-meals expenses';
