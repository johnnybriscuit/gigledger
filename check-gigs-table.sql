-- Check if net_amount column exists in gigs table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'gigs'
ORDER BY ordinal_position;
