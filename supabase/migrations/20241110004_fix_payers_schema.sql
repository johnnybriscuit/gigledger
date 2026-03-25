-- Fix payers table schema to ensure payer_type column exists
-- This migration ensures the payers table has the correct structure

-- First, create the payer_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE payer_type AS ENUM ('Venue', 'Client', 'Platform', 'Other', 'Individual', 'Corporation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create payers table if it doesn't exist
CREATE TABLE IF NOT EXISTS payers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    payer_type payer_type NOT NULL DEFAULT 'Other',
    contact_email TEXT,
    notes TEXT,
    expect_1099 BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add payer_type column if table exists but column doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payers' AND column_name = 'payer_type'
    ) THEN
        -- If old 'type' column exists, rename it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payers' AND column_name = 'type'
        ) THEN
            ALTER TABLE payers RENAME COLUMN type TO payer_type;
        ELSE
            -- Otherwise add the new column
            ALTER TABLE payers ADD COLUMN payer_type payer_type NOT NULL DEFAULT 'Other';
        END IF;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE payers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own payers" ON payers;
DROP POLICY IF EXISTS "Users can insert own payers" ON payers;
DROP POLICY IF EXISTS "Users can update own payers" ON payers;
DROP POLICY IF EXISTS "Users can delete own payers" ON payers;

-- Create RLS policies
CREATE POLICY "Users can view own payers"
    ON payers FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payers"
    ON payers FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payers"
    ON payers FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payers"
    ON payers FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS payers_user_id_idx ON payers(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_payers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payers_updated_at ON payers;
CREATE TRIGGER payers_updated_at
    BEFORE UPDATE ON payers
    FOR EACH ROW
    EXECUTE FUNCTION update_payers_updated_at();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Payers table schema fixed!';
    RAISE NOTICE '   - payer_type column ensured';
    RAISE NOTICE '   - RLS policies created';
    RAISE NOTICE '   - Indexes added';
END $$;
