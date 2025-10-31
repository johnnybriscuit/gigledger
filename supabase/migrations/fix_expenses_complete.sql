-- Complete fix for expenses table

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;

-- Ensure RLS is enabled
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Make vendor nullable
ALTER TABLE expenses ALTER COLUMN vendor DROP NOT NULL;

-- Add notes column if it doesn't exist
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create policies
CREATE POLICY "Users can view their own expenses"
ON expenses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
ON expenses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
ON expenses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
ON expenses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
