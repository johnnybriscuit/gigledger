-- Backfill is_draft column for existing expenses
-- Set NULL values to false (these are real expenses, not drafts)
UPDATE expenses
SET is_draft = false
WHERE is_draft IS NULL;

-- Make the column NOT NULL now that all values are set
ALTER TABLE expenses
ALTER COLUMN is_draft SET NOT NULL;

-- Update the default to ensure new rows get false
ALTER TABLE expenses
ALTER COLUMN is_draft SET DEFAULT false;
