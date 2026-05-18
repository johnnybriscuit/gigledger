-- Remove duplicate buckets keeping only the most recently created one per user per bucket_type
DELETE FROM public.allocation_buckets a
USING public.allocation_buckets b
WHERE a.user_id = b.user_id
  AND a.bucket_type = b.bucket_type
  AND a.created_at < b.created_at;

-- Add unique constraint to prevent future duplicates
-- Exception: 'goal' and 'debt' buckets can have multiples (user may have multiple goals/debts)
-- So use a partial index instead:
CREATE UNIQUE INDEX unique_user_core_bucket_type
ON public.allocation_buckets (user_id, bucket_type)
WHERE bucket_type NOT IN ('goal', 'debt');
