-- Add IRS Schedule C line code to expenses table
-- This field is REQUIRED for tax-ready exports

-- Add irs_schedule_c_line column
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS irs_schedule_c_line TEXT;

-- Add meals_percent_allowed column (default 0.5 = 50%)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS meals_percent_allowed NUMERIC DEFAULT 0.5
CHECK (meals_percent_allowed >= 0 AND meals_percent_allowed <= 1);

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_expenses_irs_line 
ON expenses(irs_schedule_c_line);

-- Add comments
COMMENT ON COLUMN expenses.irs_schedule_c_line IS 'IRS Schedule C line code (e.g., "8" for advertising, "24b" for meals). Required for tax exports.';
COMMENT ON COLUMN expenses.meals_percent_allowed IS 'For meals/entertainment expenses: percentage deductible (typically 0.5 for 50% limitation)';

-- Backfill irs_schedule_c_line based on existing categories
-- This is a best-effort mapping - users should review and correct
-- Categories: Rent, Travel, Meals, Lodging, Supplies, Marketing, Education, Software, Fees, Equipment, Other

UPDATE expenses
SET irs_schedule_c_line = CASE
  -- Equipment
  WHEN category = 'Equipment' THEN '22' -- Supplies
  
  -- Supplies
  WHEN category = 'Supplies' THEN '22' -- Supplies
  
  -- Marketing
  WHEN category = 'Marketing' THEN '8' -- Advertising
  
  -- Travel & Lodging
  WHEN category = 'Travel' THEN '24a' -- Travel
  WHEN category = 'Lodging' THEN '24a' -- Travel
  
  -- Meals
  WHEN category = 'Meals' THEN '24b' -- Meals (50% limitation)
  
  -- Software & Education
  WHEN category = 'Software' THEN '18' -- Office Expense
  WHEN category = 'Education' THEN '27a' -- Other expenses (or could be 18 Office)
  
  -- Fees
  WHEN category = 'Fees' THEN '10' -- Commissions and fees
  
  -- Rent
  WHEN category = 'Rent' THEN '20b' -- Rent - Other
  
  -- Other
  WHEN category = 'Other' THEN '27a' -- Other expenses
  
  -- Default to Other for any unmapped categories
  ELSE '27a' -- Other expenses
END
WHERE irs_schedule_c_line IS NULL;

-- Set meals_percent_allowed to 0.5 for meals categories
UPDATE expenses
SET meals_percent_allowed = 0.5
WHERE category IN ('Meals', 'Food')
  AND meals_percent_allowed IS NULL;
