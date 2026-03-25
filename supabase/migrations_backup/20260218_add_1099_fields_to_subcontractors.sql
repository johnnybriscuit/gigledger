-- Add 1099-NEC preparation fields to subcontractors table
-- Supports W-9 collection, address tracking, and e-delivery consent

-- Add new columns for 1099 preparation
ALTER TABLE subcontractors
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS w9_status TEXT NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS w9_document_url TEXT,
  ADD COLUMN IF NOT EXISTS edelivery_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edelivery_email TEXT,
  ADD COLUMN IF NOT EXISTS tin_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS last_1099_email_sent_at TIMESTAMPTZ;

-- Add CHECK constraint for w9_status
ALTER TABLE subcontractors
  ADD CONSTRAINT subcontractors_w9_status_check 
  CHECK (w9_status IN ('missing', 'received'));

-- Add index for 1099 queries (user_id + created_at for year filtering)
CREATE INDEX IF NOT EXISTS idx_subcontractors_user_created 
  ON subcontractors(user_id, created_at);

-- Create view for subcontractor 1099 totals by year
-- This provides the source of truth for 1099-NEC amounts
CREATE OR REPLACE VIEW subcontractor_1099_totals AS
SELECT 
  p.user_id,
  p.subcontractor_id,
  s.name,
  s.legal_name,
  s.email,
  s.edelivery_email,
  s.address_line1,
  s.address_line2,
  s.city,
  s.state,
  s.postal_code,
  s.country,
  s.tax_id_type,
  s.tax_id_last4,
  s.w9_status,
  s.w9_document_url,
  s.edelivery_consent,
  s.last_1099_email_sent_at,
  EXTRACT(YEAR FROM g.date) AS tax_year,
  COUNT(DISTINCT p.gig_id) AS gig_count,
  SUM(p.amount) AS total_paid,
  -- Flag if >= $600 threshold for 1099-NEC
  CASE WHEN SUM(p.amount) >= 600 THEN true ELSE false END AS requires_1099
FROM gig_subcontractor_payments p
INNER JOIN subcontractors s ON p.subcontractor_id = s.id
INNER JOIN gigs g ON p.gig_id = g.id
WHERE g.date IS NOT NULL
GROUP BY 
  p.user_id,
  p.subcontractor_id,
  s.name,
  s.legal_name,
  s.email,
  s.edelivery_email,
  s.address_line1,
  s.address_line2,
  s.city,
  s.state,
  s.postal_code,
  s.country,
  s.tax_id_type,
  s.tax_id_last4,
  s.w9_status,
  s.w9_document_url,
  s.edelivery_consent,
  s.last_1099_email_sent_at,
  EXTRACT(YEAR FROM g.date);

-- Grant access to the view (follows RLS from underlying tables)
COMMENT ON VIEW subcontractor_1099_totals IS 
  'Year-to-date totals for subcontractor 1099-NEC preparation. Aggregates gig_subcontractor_payments by tax year.';

-- Create optional table for tracking 1099 email deliveries
CREATE TABLE IF NOT EXISTS subcontractor_1099_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_method TEXT NOT NULL DEFAULT 'email',
  notes TEXT
);

-- Add indexes for delivery tracking
CREATE INDEX IF NOT EXISTS idx_1099_deliveries_user_id 
  ON subcontractor_1099_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_1099_deliveries_subcontractor_id 
  ON subcontractor_1099_deliveries(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_1099_deliveries_tax_year 
  ON subcontractor_1099_deliveries(user_id, tax_year);

-- Enable RLS on deliveries table
ALTER TABLE subcontractor_1099_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subcontractor_1099_deliveries
CREATE POLICY "Users can view their own 1099 deliveries"
  ON subcontractor_1099_deliveries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 1099 deliveries"
  ON subcontractor_1099_deliveries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own 1099 deliveries"
  ON subcontractor_1099_deliveries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own 1099 deliveries"
  ON subcontractor_1099_deliveries FOR DELETE
  USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON COLUMN subcontractors.legal_name IS 'Legal name for tax forms (if different from display name)';
COMMENT ON COLUMN subcontractors.w9_status IS 'W-9 collection status: missing or received';
COMMENT ON COLUMN subcontractors.w9_document_url IS 'Supabase Storage path to uploaded W-9 document';
COMMENT ON COLUMN subcontractors.edelivery_consent IS 'Whether subcontractor consented to electronic 1099 delivery';
COMMENT ON COLUMN subcontractors.edelivery_email IS 'Email for 1099 delivery (defaults to main email if not set)';
COMMENT ON COLUMN subcontractors.tin_encrypted IS 'Encrypted TIN (placeholder for future; not used in current implementation)';
COMMENT ON COLUMN subcontractors.last_1099_email_sent_at IS 'Timestamp of last 1099 email sent to this subcontractor';
