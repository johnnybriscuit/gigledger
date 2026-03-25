-- Migration: Add payment_methods_config JSONB column to invoice_settings
-- Date: 2026-02-10
-- Purpose: Support structured payment method configurations with method-specific fields
--
-- MIGRATION NOTES:
-- This adds a new payment_methods_config JSONB column to store structured payment method data.
-- The old accepted_payment_methods JSONB array is kept for backward compatibility.
-- 
-- Rollout approach:
-- 1. Column is nullable - existing rows continue to work
-- 2. UI will read payment_methods_config if present, otherwise fall back to accepted_payment_methods
-- 3. UI will migrate old data to new format on first save
-- 4. After all users have been migrated organically, we can deprecate accepted_payment_methods
--
-- New structure example:
-- {
--   "enabled": true,
--   "methods": [
--     {
--       "type": "venmo",
--       "enabled": true,
--       "handle": "@johndoe",
--       "note": "Please include invoice number"
--     },
--     {
--       "type": "wire",
--       "enabled": true,
--       "instructions": "Contact support@bozzygigs.com for wire details",
--       "includeBankDetailsOnInvoice": false
--     }
--   ]
-- }

-- Add the new column
ALTER TABLE invoice_settings
ADD COLUMN IF NOT EXISTS payment_methods_config JSONB;

-- Add a comment explaining the column
COMMENT ON COLUMN invoice_settings.payment_methods_config IS 
'Structured payment method configuration with method-specific fields. Replaces the generic accepted_payment_methods array.';

-- Create an index for querying payment methods config
CREATE INDEX IF NOT EXISTS idx_invoice_settings_payment_methods_config 
ON invoice_settings USING GIN (payment_methods_config);
