-- Create subcontractors directory and gig payment tracking
-- Allows tracking payouts to bandmates/crew as deductible costs

-- Create subcontractors table
CREATE TABLE IF NOT EXISTS subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id_type TEXT CHECK (tax_id_type IN ('ssn', 'ein')),
  tax_id_last4 TEXT CHECK (length(tax_id_last4) = 4 AND tax_id_last4 ~ '^[0-9]+$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create gig_subcontractor_payments table
CREATE TABLE IF NOT EXISTS gig_subcontractor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gig_id, subcontractor_id)
);

-- Add indexes for performance
CREATE INDEX idx_subcontractors_user_id ON subcontractors(user_id);
CREATE INDEX idx_subcontractors_name ON subcontractors(user_id, name);
CREATE INDEX idx_gig_subcontractor_payments_user_id ON gig_subcontractor_payments(user_id);
CREATE INDEX idx_gig_subcontractor_payments_gig_id ON gig_subcontractor_payments(gig_id);
CREATE INDEX idx_gig_subcontractor_payments_subcontractor_id ON gig_subcontractor_payments(subcontractor_id);

-- Enable RLS
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_subcontractor_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subcontractors
CREATE POLICY "Users can view their own subcontractors"
  ON subcontractors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subcontractors"
  ON subcontractors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subcontractors"
  ON subcontractors FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subcontractors"
  ON subcontractors FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for gig_subcontractor_payments
CREATE POLICY "Users can view their own subcontractor payments"
  ON gig_subcontractor_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subcontractor payments"
  ON gig_subcontractor_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subcontractor payments"
  ON gig_subcontractor_payments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subcontractor payments"
  ON gig_subcontractor_payments FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at on subcontractors
CREATE OR REPLACE FUNCTION update_subcontractors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subcontractors_updated_at
  BEFORE UPDATE ON subcontractors
  FOR EACH ROW
  EXECUTE FUNCTION update_subcontractors_updated_at();
