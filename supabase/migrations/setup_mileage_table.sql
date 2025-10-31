-- Update mileage table schema and add RLS policies

-- Rename columns if they exist with old names
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mileage' AND column_name='origin') THEN
        ALTER TABLE mileage RENAME COLUMN origin TO start_location;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mileage' AND column_name='destination') THEN
        ALTER TABLE mileage RENAME COLUMN end_location TO end_location;
    END IF;
END $$;

-- Add notes column if it doesn't exist
ALTER TABLE mileage ADD COLUMN IF NOT EXISTS notes TEXT;

-- Drop old columns if they exist
ALTER TABLE mileage DROP COLUMN IF EXISTS rate;
ALTER TABLE mileage DROP COLUMN IF EXISTS total;

-- Enable RLS
ALTER TABLE mileage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own mileage" ON mileage;
DROP POLICY IF EXISTS "Users can insert their own mileage" ON mileage;
DROP POLICY IF EXISTS "Users can update their own mileage" ON mileage;
DROP POLICY IF EXISTS "Users can delete their own mileage" ON mileage;

-- Create RLS policies
CREATE POLICY "Users can view their own mileage"
ON mileage FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mileage"
ON mileage FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mileage"
ON mileage FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mileage"
ON mileage FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
