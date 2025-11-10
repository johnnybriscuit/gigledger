-- Ensure gigs table has user_id column and proper constraints
-- This fixes the "null value in column 'user_id' violates not-null constraint" error

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gigs' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE gigs ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS gigs_user_id_idx ON gigs(user_id);
        
        RAISE NOTICE 'Added user_id column to gigs table';
    ELSE
        RAISE NOTICE 'user_id column already exists in gigs table';
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own gigs" ON gigs;
DROP POLICY IF EXISTS "Users can insert own gigs" ON gigs;
DROP POLICY IF EXISTS "Users can update own gigs" ON gigs;
DROP POLICY IF EXISTS "Users can delete own gigs" ON gigs;

-- Create RLS policies
CREATE POLICY "Users can view own gigs"
    ON gigs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gigs"
    ON gigs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gigs"
    ON gigs FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gigs"
    ON gigs FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Gigs table user_id column and RLS policies ensured!';
END $$;
