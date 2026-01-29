-- Add Receipt Assist columns to expenses table
-- This enables automatic extraction of receipt data via OCR

-- Add receipt processing status and metadata columns
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_extraction_status TEXT DEFAULT 'none' CHECK (receipt_extraction_status IN ('none', 'pending', 'succeeded', 'failed'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_extracted_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_extraction_error TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_extracted_json JSONB;

-- Add extracted receipt data columns (normalized from JSON)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_vendor TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_total NUMERIC(12,2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_currency TEXT DEFAULT 'USD';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_date DATE;

-- Add category suggestion columns
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_suggestion TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_confidence NUMERIC(3,2) CHECK (category_confidence IS NULL OR (category_confidence >= 0 AND category_confidence <= 1));

-- Add receipt deduplication and storage metadata
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_sha256 TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_storage_path TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_mime TEXT;

-- Create index on sha256 for duplicate detection (scoped to user)
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_sha256 ON expenses(user_id, receipt_sha256) WHERE receipt_sha256 IS NOT NULL;

-- Create index on extraction status for monitoring
CREATE INDEX IF NOT EXISTS idx_expenses_extraction_status ON expenses(receipt_extraction_status) WHERE receipt_extraction_status != 'none';

-- Add comment
COMMENT ON COLUMN expenses.receipt_extraction_status IS 'Status of receipt OCR processing: none (no receipt or not processed), pending (in progress), succeeded (extracted), failed (error)';
COMMENT ON COLUMN expenses.receipt_extracted_json IS 'Full JSON response from OCR provider for debugging and future enhancements';
COMMENT ON COLUMN expenses.category_suggestion IS 'AI-suggested expense category based on receipt content';
COMMENT ON COLUMN expenses.category_confidence IS 'Confidence score (0-1) for category suggestion';
COMMENT ON COLUMN expenses.receipt_sha256 IS 'SHA-256 hash of receipt file for duplicate detection';
