-- Complete setup: Create profiles table + tax withholding tables
-- Run this in Supabase SQL Editor

-- 1. Create profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  state_code TEXT,
  filing_status TEXT DEFAULT 'single',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint for filing_status
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS filing_status_check;

ALTER TABLE profiles
ADD CONSTRAINT filing_status_check 
CHECK (filing_status IN ('single', 'married', 'hoh'));

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Add comments
COMMENT ON TABLE profiles IS 'User profile information';
COMMENT ON COLUMN profiles.state_code IS 'Two-letter US state code (e.g., TN, CA, NY)';
COMMENT ON COLUMN profiles.filing_status IS 'Tax filing status: single, married, or hoh (head of household)';

-- 2. Create state_tax_rates table
CREATE TABLE IF NOT EXISTS state_tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  effective_year INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('flat', 'bracket')),
  flat_rate NUMERIC,
  brackets JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS state_tax_rates_state_year_idx 
ON state_tax_rates(state_code, effective_year);

-- Add comments
COMMENT ON TABLE state_tax_rates IS 'State income tax rates by year. Allows updating rates without code changes.';
COMMENT ON COLUMN state_tax_rates.state_code IS 'Two-letter US state code';
COMMENT ON COLUMN state_tax_rates.effective_year IS 'Tax year these rates apply to';
COMMENT ON COLUMN state_tax_rates.type IS 'Rate type: flat (single rate) or bracket (progressive)';
COMMENT ON COLUMN state_tax_rates.flat_rate IS 'For flat tax states, the single rate (e.g., 0.05 for 5%)';
COMMENT ON COLUMN state_tax_rates.brackets IS 'For bracket states: [{"upTo": number|null, "rate": number}]';
COMMENT ON COLUMN state_tax_rates.notes IS 'Additional information about this rate';

-- 3. Enable RLS on state_tax_rates
ALTER TABLE state_tax_rates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read tax rates
DROP POLICY IF EXISTS "Allow authenticated users to read tax rates" ON state_tax_rates;
CREATE POLICY "Allow authenticated users to read tax rates"
ON state_tax_rates
FOR SELECT
TO authenticated
USING (true);

-- 4. Seed initial tax rates for 2025
-- ⚠️ WARNING: These are PLACEHOLDER rates for development only!
INSERT INTO state_tax_rates (state_code, effective_year, type, flat_rate, brackets, notes)
VALUES
  -- No income tax states
  ('TN', 2025, 'flat', 0, NULL, 'PLACEHOLDER: Tennessee has no state income tax'),
  ('FL', 2025, 'flat', 0, NULL, 'PLACEHOLDER: Florida has no state income tax'),
  ('TX', 2025, 'flat', 0, NULL, 'PLACEHOLDER: Texas has no state income tax'),
  ('WA', 2025, 'flat', 0, NULL, 'PLACEHOLDER: Washington has no state income tax'),
  ('NV', 2025, 'flat', 0, NULL, 'PLACEHOLDER: Nevada has no state income tax'),
  ('SD', 2025, 'flat', 0, NULL, 'PLACEHOLDER: South Dakota has no state income tax'),
  ('WY', 2025, 'flat', 0, NULL, 'PLACEHOLDER: Wyoming has no state income tax'),
  ('AK', 2025, 'flat', 0, NULL, 'PLACEHOLDER: Alaska has no state income tax'),
  
  -- Flat tax states (PLACEHOLDER RATES)
  ('MD', 2025, 'flat', 0.0475, NULL, 'PLACEHOLDER: Maryland flat rate ~4.75%'),
  ('IL', 2025, 'flat', 0.0495, NULL, 'PLACEHOLDER: Illinois flat rate ~4.95%'),
  ('PA', 2025, 'flat', 0.0307, NULL, 'PLACEHOLDER: Pennsylvania flat rate ~3.07%'),
  ('CO', 2025, 'flat', 0.044, NULL, 'PLACEHOLDER: Colorado flat rate ~4.4%'),
  
  -- Progressive bracket states (PLACEHOLDER BRACKETS)
  ('CA', 2025, 'bracket', NULL, 
   '[
     {"upTo": 10000, "rate": 0.01},
     {"upTo": 25000, "rate": 0.02},
     {"upTo": 50000, "rate": 0.04},
     {"upTo": 100000, "rate": 0.06},
     {"upTo": null, "rate": 0.08}
   ]'::jsonb,
   'PLACEHOLDER: California progressive brackets'),
  
  ('NY', 2025, 'bracket', NULL,
   '[
     {"upTo": 8500, "rate": 0.04},
     {"upTo": 11700, "rate": 0.045},
     {"upTo": 13900, "rate": 0.0525},
     {"upTo": 80650, "rate": 0.055},
     {"upTo": 215400, "rate": 0.06},
     {"upTo": null, "rate": 0.0685}
   ]'::jsonb,
   'PLACEHOLDER: New York progressive brackets'),
  
  ('GA', 2025, 'bracket', NULL,
   '[
     {"upTo": 750, "rate": 0.01},
     {"upTo": 2250, "rate": 0.02},
     {"upTo": 3750, "rate": 0.03},
     {"upTo": 5250, "rate": 0.04},
     {"upTo": 7000, "rate": 0.05},
     {"upTo": null, "rate": 0.0575}
   ]'::jsonb,
   'PLACEHOLDER: Georgia progressive brackets')
ON CONFLICT (state_code, effective_year) DO NOTHING;

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_state_tax_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for updated_at
DROP TRIGGER IF EXISTS state_tax_rates_updated_at ON state_tax_rates;
CREATE TRIGGER state_tax_rates_updated_at
BEFORE UPDATE ON state_tax_rates
FOR EACH ROW
EXECUTE FUNCTION update_state_tax_rates_updated_at();

-- 7. Note: Profiles will be created automatically when users sign up
-- You can manually create your profile after running this migration

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Setup complete! Tables created:';
  RAISE NOTICE '   - profiles (with state_code and filing_status)';
  RAISE NOTICE '   - state_tax_rates (seeded with 16 states)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '   1. Update your profile with state_code (e.g., TN, CA)';
  RAISE NOTICE '   2. Add env variables to .env.local';
  RAISE NOTICE '   3. Restart your dev server';
  RAISE NOTICE '   4. Test the withholding card in Add Gig form';
END $$;
