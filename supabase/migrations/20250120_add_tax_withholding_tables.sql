-- Migration: Add tax withholding tables and update profiles
-- Created: 2025-01-20
-- Purpose: Support state-based tax withholding calculations

-- 1. Update profiles table to include tax information
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS state_code TEXT,
ADD COLUMN IF NOT EXISTS filing_status TEXT DEFAULT 'single';

-- Add check constraint for filing_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'filing_status_check' 
    AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT filing_status_check 
    CHECK (filing_status IN ('single', 'married', 'hoh'));
  END IF;
END $$;

-- Add comment
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
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'state_tax_rates' 
    AND policyname = 'Allow authenticated users to read tax rates'
  ) THEN
    CREATE POLICY "Allow authenticated users to read tax rates"
    ON state_tax_rates
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Only service role can insert/update/delete
-- (No policies for INSERT/UPDATE/DELETE means only service role can do these operations)

-- 4. Seed initial tax rates for 2025
-- ⚠️ WARNING: These are PLACEHOLDER rates for development only!
-- TODO: Replace with actual 2025 state tax rates before production deployment
-- TODO: Consult IRS and state revenue department publications for accurate rates

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
  
  -- Flat tax states (PLACEHOLDER RATES - verify before production!)
  ('MD', 2025, 'flat', 0.0475, NULL, 'PLACEHOLDER: Maryland flat rate ~4.75% - VERIFY ACTUAL RATE'),
  ('IL', 2025, 'flat', 0.0495, NULL, 'PLACEHOLDER: Illinois flat rate ~4.95% - VERIFY ACTUAL RATE'),
  ('PA', 2025, 'flat', 0.0307, NULL, 'PLACEHOLDER: Pennsylvania flat rate ~3.07% - VERIFY ACTUAL RATE'),
  ('CO', 2025, 'flat', 0.044, NULL, 'PLACEHOLDER: Colorado flat rate ~4.4% - VERIFY ACTUAL RATE'),
  
  -- Progressive bracket states (PLACEHOLDER BRACKETS - verify before production!)
  ('CA', 2025, 'bracket', NULL, 
   '[
     {"upTo": 10000, "rate": 0.01},
     {"upTo": 25000, "rate": 0.02},
     {"upTo": 50000, "rate": 0.04},
     {"upTo": 100000, "rate": 0.06},
     {"upTo": null, "rate": 0.08}
   ]'::jsonb,
   'PLACEHOLDER: California progressive brackets - VERIFY ACTUAL 2025 BRACKETS'),
  
  ('NY', 2025, 'bracket', NULL,
   '[
     {"upTo": 8500, "rate": 0.04},
     {"upTo": 11700, "rate": 0.045},
     {"upTo": 13900, "rate": 0.0525},
     {"upTo": 80650, "rate": 0.055},
     {"upTo": 215400, "rate": 0.06},
     {"upTo": null, "rate": 0.0685}
   ]'::jsonb,
   'PLACEHOLDER: New York progressive brackets - VERIFY ACTUAL 2025 BRACKETS'),
  
  ('GA', 2025, 'bracket', NULL,
   '[
     {"upTo": 750, "rate": 0.01},
     {"upTo": 2250, "rate": 0.02},
     {"upTo": 3750, "rate": 0.03},
     {"upTo": 5250, "rate": 0.04},
     {"upTo": 7000, "rate": 0.05},
     {"upTo": null, "rate": 0.0575}
   ]'::jsonb,
   'PLACEHOLDER: Georgia progressive brackets - VERIFY ACTUAL 2025 BRACKETS')
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

-- 7. Admin helper function to update a flat rate
-- Usage: SELECT update_state_flat_rate('CA', 2025, 0.093, 'Updated to actual 2025 rate');
CREATE OR REPLACE FUNCTION update_state_flat_rate(
  p_state_code TEXT,
  p_year INTEGER,
  p_rate NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE state_tax_rates
  SET 
    flat_rate = p_rate,
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE state_code = p_state_code 
    AND effective_year = p_year
    AND type = 'flat';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No flat rate found for state % in year %', p_state_code, p_year;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role only
REVOKE ALL ON FUNCTION update_state_flat_rate FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_state_flat_rate TO service_role;
