-- Simplified migration - try this if the full one fails
-- Run this in Supabase SQL Editor after refreshing the page

-- Create state_tax_rates table
CREATE TABLE state_tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  effective_year INTEGER NOT NULL,
  type TEXT NOT NULL,
  flat_rate NUMERIC,
  brackets JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(state_code, effective_year)
);

-- Enable RLS
ALTER TABLE state_tax_rates ENABLE ROW LEVEL SECURITY;

-- Allow reads
CREATE POLICY "read_tax_rates" ON state_tax_rates FOR SELECT TO authenticated USING (true);

-- Seed TN (for testing)
INSERT INTO state_tax_rates (state_code, effective_year, type, flat_rate, notes)
VALUES ('TN', 2025, 'flat', 0, 'Tennessee - no state income tax');
