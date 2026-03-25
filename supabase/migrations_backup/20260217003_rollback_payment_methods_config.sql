-- Rollback: Clear payment_methods_config to re-run migration
-- This does NOT drop the columns, just clears the data

UPDATE invoice_settings
SET payment_methods_config = '{}'::jsonb
WHERE payment_methods_config IS NOT NULL;

UPDATE invoices
SET payment_methods_config = '{}'::jsonb
WHERE payment_methods_config IS NOT NULL;

-- Verify rollback
SELECT user_id, payment_methods_config 
FROM invoice_settings;
