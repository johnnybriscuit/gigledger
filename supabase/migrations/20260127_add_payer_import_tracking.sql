-- Add tracking for payers created during CSV imports
-- This allows safe undo that only deletes payers created by a specific import batch

ALTER TABLE payers ADD COLUMN IF NOT EXISTS created_by_import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;

-- Create index for faster lookups during undo
CREATE INDEX IF NOT EXISTS idx_payers_created_by_import_batch ON payers(created_by_import_batch_id);
