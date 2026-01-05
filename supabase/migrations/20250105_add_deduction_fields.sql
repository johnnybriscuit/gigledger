-- Add business_use_percent field to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS business_use_percent INTEGER DEFAULT 100 CHECK (business_use_percent >= 0 AND business_use_percent <= 100);

-- Add comment to explain the field
COMMENT ON COLUMN expenses.business_use_percent IS 'Percentage of expense used for business purposes (0-100). Default is 100%.';

-- Note: meals_percent_allowed already exists in the database
-- It will be automatically set to 50 for Meals & Entertainment category in the application logic
