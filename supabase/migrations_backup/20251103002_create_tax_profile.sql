-- Create user_tax_profile table for 2025 tax engine
-- This stores user's tax filing information for accurate tax calculations

CREATE TABLE IF NOT EXISTS user_tax_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tax year (default to current year)
  tax_year INTEGER NOT NULL DEFAULT 2025,
  
  -- Filing status
  filing_status TEXT NOT NULL CHECK (filing_status IN ('single', 'married_joint', 'married_separate', 'head')),
  
  -- State (limited to supported states)
  state TEXT NOT NULL CHECK (state IN ('TN', 'TX', 'CA', 'NY', 'MD')),
  
  -- Maryland-specific: County for local tax
  county TEXT,
  
  -- New York-specific: NYC and Yonkers residency
  nyc_resident BOOLEAN DEFAULT FALSE,
  yonkers_resident BOOLEAN DEFAULT FALSE,
  
  -- Deduction method
  deduction_method TEXT NOT NULL DEFAULT 'standard' CHECK (deduction_method IN ('standard', 'itemized')),
  itemized_amount NUMERIC(10, 2),
  
  -- Self-employment income flag
  se_income BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE user_tax_profile ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tax profile
CREATE POLICY "Users can view own tax profile"
  ON user_tax_profile
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tax profile
CREATE POLICY "Users can insert own tax profile"
  ON user_tax_profile
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tax profile
CREATE POLICY "Users can update own tax profile"
  ON user_tax_profile
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tax profile
CREATE POLICY "Users can delete own tax profile"
  ON user_tax_profile
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index on user_id for faster lookups
CREATE INDEX idx_user_tax_profile_user_id ON user_tax_profile(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_tax_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_tax_profile_updated_at
  BEFORE UPDATE ON user_tax_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tax_profile_updated_at();

-- Add constraints for state-specific fields
-- MD: County is required
-- NY: NYC and Yonkers flags only apply to NY residents

-- Add check constraint for MD county requirement
ALTER TABLE user_tax_profile
  ADD CONSTRAINT check_md_county
  CHECK (
    (state = 'MD' AND county IS NOT NULL) OR
    (state != 'MD')
  );

-- Add check constraint for NY-specific fields
ALTER TABLE user_tax_profile
  ADD CONSTRAINT check_ny_fields
  CHECK (
    (state = 'NY') OR
    (state != 'NY' AND nyc_resident = FALSE AND yonkers_resident = FALSE)
  );

-- Add check constraint for itemized amount
ALTER TABLE user_tax_profile
  ADD CONSTRAINT check_itemized_amount
  CHECK (
    (deduction_method = 'itemized' AND itemized_amount IS NOT NULL AND itemized_amount > 0) OR
    (deduction_method = 'standard')
  );

-- Comment on table
COMMENT ON TABLE user_tax_profile IS 'User tax filing information for 2025 tax calculations';
COMMENT ON COLUMN user_tax_profile.filing_status IS 'IRS filing status: single, married_joint, married_separate, or head of household';
COMMENT ON COLUMN user_tax_profile.state IS 'State of residence (TN, TX, CA, NY, MD)';
COMMENT ON COLUMN user_tax_profile.county IS 'Maryland county for local tax calculation';
COMMENT ON COLUMN user_tax_profile.nyc_resident IS 'NYC resident flag for NYC income tax';
COMMENT ON COLUMN user_tax_profile.yonkers_resident IS 'Yonkers resident flag for Yonkers surcharge';
COMMENT ON COLUMN user_tax_profile.deduction_method IS 'Standard or itemized deduction';
COMMENT ON COLUMN user_tax_profile.se_income IS 'Has self-employment income (triggers SE tax calculation)';
