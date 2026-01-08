-- Check if the delete policy exists for invoices table
DO $$
BEGIN
    -- Drop the policy if it exists (to recreate it)
    DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;
    
    -- Create the delete policy
    CREATE POLICY "Users can delete their own invoices"
      ON invoices FOR DELETE
      USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Invoice delete policy created successfully';
END $$;

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'invoices' 
AND policyname = 'Users can delete their own invoices';
