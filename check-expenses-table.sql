-- Check the expenses table structure
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'expenses'
ORDER BY ordinal_position;
