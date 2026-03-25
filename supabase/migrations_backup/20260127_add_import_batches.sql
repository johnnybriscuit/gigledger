-- Add import_batch_id to gigs table for tracking imported gigs
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Create import_batches table for tracking CSV imports
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Import statistics
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_duplicates INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  
  -- Totals
  total_gross DECIMAL(10, 2) DEFAULT 0,
  total_tips DECIMAL(10, 2) DEFAULT 0,
  total_fees DECIMAL(10, 2) DEFAULT 0,
  
  -- Metadata
  combined_rows BOOLEAN DEFAULT FALSE,
  new_payers_created INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for import_batches
CREATE POLICY "Users can view their own import batches"
  ON import_batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import batches"
  ON import_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import batches"
  ON import_batches FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gigs_import_batch_id ON gigs(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_user_id ON import_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON import_batches(created_at DESC);
