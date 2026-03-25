-- Migration: Add payment_methods_config JSONB columns to invoice_settings and invoices
-- Date: 2026-02-17
-- Purpose: Support structured payment method configurations with method-specific fields
--
-- Schema changes:
-- 1. Add payment_methods_config to invoice_settings (stores structured details per method)
-- 2. Add payment_methods_config to invoices (snapshot/override config for each invoice)
-- 3. Backfill existing data from legacy accepted_payment_methods format
--
-- Data model:
-- - accepted_payment_methods: array of enabled method keys ["cash", "venmo", "wire", ...]
-- - payment_methods_config: object keyed by method with method-specific fields
--   {
--     "venmo": { "handle": "@username", "note": "..." },
--     "wire": { "instructions": "...", "includeBankDetails": false },
--     "check": { "payableTo": "...", "mailingAddress": "...", "memo": "..." }
--   }

-- Add payment_methods_config column to invoice_settings
ALTER TABLE invoice_settings
ADD COLUMN IF NOT EXISTS payment_methods_config JSONB DEFAULT '{}'::jsonb;

-- Add payment_methods_config column to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_methods_config JSONB DEFAULT '{}'::jsonb;

-- Add comments explaining the columns
COMMENT ON COLUMN invoice_settings.payment_methods_config IS 
'Structured payment method configuration with method-specific fields. Keyed by method name (e.g., venmo, wire, check).';

COMMENT ON COLUMN invoices.payment_methods_config IS 
'Snapshot of payment method configuration for this invoice. Allows overriding default settings.';

-- Create indexes for querying payment methods config
CREATE INDEX IF NOT EXISTS idx_invoice_settings_payment_methods_config 
ON invoice_settings USING GIN (payment_methods_config);

CREATE INDEX IF NOT EXISTS idx_invoices_payment_methods_config 
ON invoices USING GIN (payment_methods_config);

-- Backfill function to migrate legacy payment method data
-- Handles both legacy object format [{method:"venmo", details:"@x"}] and simple string arrays
CREATE OR REPLACE FUNCTION backfill_payment_methods_config()
RETURNS void AS $$
DECLARE
  settings_row RECORD;
  method_obj JSONB;
  method_name TEXT;
  method_details TEXT;
  new_config JSONB;
BEGIN
  -- Process each invoice_settings row
  FOR settings_row IN 
    SELECT id, user_id, accepted_payment_methods 
    FROM invoice_settings
    WHERE payment_methods_config = '{}'::jsonb
      AND accepted_payment_methods IS NOT NULL
      AND jsonb_array_length(accepted_payment_methods) > 0
  LOOP
    new_config := '{}'::jsonb;
    
    -- Check if first element is an object (legacy format) or string (current format)
    IF jsonb_typeof(accepted_payment_methods->0) = 'object' THEN
      -- Legacy format: [{method:"venmo", details:"@x"}, ...]
      FOR method_obj IN SELECT * FROM jsonb_array_elements(settings_row.accepted_payment_methods)
      LOOP
        method_name := lower(method_obj->>'method'); -- Normalize to lowercase
        method_details := method_obj->>'details';
        
        IF method_name IS NOT NULL AND method_details IS NOT NULL AND method_details != '' THEN
          -- Map legacy details to appropriate field based on method
          CASE method_name
            WHEN 'venmo' THEN
              new_config := new_config || jsonb_build_object(
                method_name, 
                jsonb_build_object('handle', method_details)
              );
            WHEN 'zelle', 'paypal' THEN
              new_config := new_config || jsonb_build_object(
                method_name, 
                jsonb_build_object('contact', method_details)
              );
            WHEN 'cashapp' THEN
              new_config := new_config || jsonb_build_object(
                method_name, 
                jsonb_build_object('cashtag', method_details)
              );
            ELSE
              -- For other methods (cash, check, wire, creditcard), use instructions
              new_config := new_config || jsonb_build_object(
                method_name, 
                jsonb_build_object('instructions', method_details)
              );
          END CASE;
        END IF;
      END LOOP;
      
      -- Update with migrated config
      IF new_config != '{}'::jsonb THEN
        UPDATE invoice_settings
        SET payment_methods_config = new_config
        WHERE id = settings_row.id;
        
        RAISE NOTICE 'Migrated payment methods for user %: %', settings_row.user_id, new_config;
      END IF;
    ELSE
      -- Current format: ["cash", "venmo", ...] - no details to migrate
      -- Leave payment_methods_config empty; user will fill in details via UI
      RAISE NOTICE 'Skipping user % - accepted_payment_methods is already string array format', settings_row.user_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the backfill
SELECT backfill_payment_methods_config();

-- Drop the backfill function (no longer needed after migration)
DROP FUNCTION backfill_payment_methods_config();

-- Update accepted_payment_methods to ensure it's always a string array going forward
-- This function normalizes any legacy object format to string array
CREATE OR REPLACE FUNCTION normalize_accepted_payment_methods()
RETURNS void AS $$
DECLARE
  settings_row RECORD;
  method_obj JSONB;
  method_names TEXT[];
BEGIN
  FOR settings_row IN 
    SELECT id, accepted_payment_methods 
    FROM invoice_settings
    WHERE accepted_payment_methods IS NOT NULL
      AND jsonb_array_length(accepted_payment_methods) > 0
      AND jsonb_typeof(accepted_payment_methods->0) = 'object'
  LOOP
    method_names := ARRAY[]::TEXT[];
    
    FOR method_obj IN SELECT * FROM jsonb_array_elements(settings_row.accepted_payment_methods)
    LOOP
      IF method_obj->>'method' IS NOT NULL THEN
        method_names := array_append(method_names, method_obj->>'method');
      END IF;
    END LOOP;
    
    IF array_length(method_names, 1) > 0 THEN
      UPDATE invoice_settings
      SET accepted_payment_methods = to_jsonb(method_names)
      WHERE id = settings_row.id;
      
      RAISE NOTICE 'Normalized accepted_payment_methods for settings %: %', settings_row.id, method_names;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run normalization
SELECT normalize_accepted_payment_methods();

-- Drop the normalization function
DROP FUNCTION normalize_accepted_payment_methods();
