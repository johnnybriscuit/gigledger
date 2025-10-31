-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own expenses
CREATE POLICY "Users can view their own expenses"
ON expenses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own expenses
CREATE POLICY "Users can insert their own expenses"
ON expenses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own expenses
CREATE POLICY "Users can update their own expenses"
ON expenses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own expenses
CREATE POLICY "Users can delete their own expenses"
ON expenses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
