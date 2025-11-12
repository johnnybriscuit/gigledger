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

UPDATE expenses
SET irs_schedule_c_line = CASE
  -- Equipment & Gear
  WHEN category IN ('Equipment', 'Instruments', 'Gear') THEN '22' -- Supplies
  
  -- Marketing & Promotion
  WHEN category IN ('Marketing', 'Advertising', 'Website') THEN '8' -- Advertising
  
  -- Professional Services
  WHEN category IN ('Legal', 'Accounting', 'Professional Services') THEN '17' -- Legal/Professional
  
  -- Travel
  WHEN category IN ('Travel', 'Lodging') THEN '24a' -- Travel
  
  -- Meals
  WHEN category IN ('Meals', 'Food') THEN '24b' -- Meals (50% limitation)
  
  -- Office & Supplies
  WHEN category IN ('Office Supplies', 'Software', 'Subscriptions') THEN '18' -- Office Expense
  
  -- Utilities & Communications
  WHEN category IN ('Phone', 'Internet', 'Utilities') THEN '25' -- Utilities
  
  -- Insurance
  WHEN category = 'Insurance' THEN '15' -- Insurance
  WHEN category = 'Health Insurance' THEN '14' -- Employee Benefit
  
  -- Repairs & Maintenance
  WHEN category IN ('Repairs', 'Maintenance') THEN '21' -- Repairs/Maintenance
  
  -- Rent
  WHEN category = 'Vehicle Rent' THEN '20a' -- Rent - Vehicles
  WHEN category IN ('Rent', 'Studio Rent') THEN '20b' -- Rent - Other
  
  -- Default to Other
  ELSE '27a' -- Other expenses
END
WHERE irs_schedule_c_line IS NULL;

-- Set meals_percent_allowed to 0.5 for meals categories
UPDATE expenses
SET meals_percent_allowed = 0.5
WHERE category IN ('Meals', 'Food')
  AND meals_percent_allowed IS NULL;
