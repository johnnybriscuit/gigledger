-- GigLedger Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE payer_type AS ENUM ('Venue', 'Client', 'Platform', 'Other');
CREATE TYPE expense_category AS ENUM ('Travel', 'Meals', 'Lodging', 'Supplies', 'Marketing', 'Education', 'Software', 'Fees', 'Equipment', 'Other');

-- Payers table
CREATE TABLE payers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type payer_type NOT NULL,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gigs table
CREATE TABLE gigs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES payers(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tips NUMERIC(12,2) NOT NULL DEFAULT 0,
  fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  vendor TEXT NOT NULL,
  description TEXT NOT NULL,
  category expense_category NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mileage table
CREATE TABLE mileage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  purpose TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  miles NUMERIC(10,2) NOT NULL,
  rate NUMERIC(10,2) NOT NULL DEFAULT 0.67,
  total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_payers_user_id ON payers(user_id);
CREATE INDEX idx_gigs_user_id ON gigs(user_id);
CREATE INDEX idx_gigs_date ON gigs(date);
CREATE INDEX idx_gigs_payer_id ON gigs(payer_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_mileage_user_id ON mileage(user_id);
CREATE INDEX idx_mileage_date ON mileage(date);

-- Enable Row Level Security
ALTER TABLE payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payers
CREATE POLICY "Users can view own payers"
  ON payers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payers"
  ON payers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payers"
  ON payers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payers"
  ON payers FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for gigs
CREATE POLICY "Users can view own gigs"
  ON gigs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gigs"
  ON gigs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gigs"
  ON gigs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gigs"
  ON gigs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for expenses
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for mileage
CREATE POLICY "Users can view own mileage"
  ON mileage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mileage"
  ON mileage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mileage"
  ON mileage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mileage"
  ON mileage FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_payers_updated_at BEFORE UPDATE ON payers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gigs_updated_at BEFORE UPDATE ON gigs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mileage_updated_at BEFORE UPDATE ON mileage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for receipts (run in Supabase Dashboard > Storage)
-- Bucket name: receipts
-- Public: false
-- File size limit: 5MB
-- Allowed MIME types: image/*, application/pdf

-- Storage RLS policies (apply in Storage settings)
-- SELECT: (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid)
-- INSERT: (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid)
-- UPDATE: (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid)
-- DELETE: (bucket_id = 'receipts' AND auth.uid() = (storage.foldername(name))[1]::uuid)
