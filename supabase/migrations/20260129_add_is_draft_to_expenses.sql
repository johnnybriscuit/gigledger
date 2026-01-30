-- Add is_draft column to expenses table for receipt-first flow
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- Create index for querying draft expenses
CREATE INDEX IF NOT EXISTS idx_expenses_is_draft ON expenses(user_id, is_draft) WHERE is_draft = true;

-- Add comment
COMMENT ON COLUMN expenses.is_draft IS 'Indicates if this is a draft expense created during receipt upload, before user finalizes';
