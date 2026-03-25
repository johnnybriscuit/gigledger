-- Phase 1: Add invoice lifetime limit enforcement for Free plan
-- Free users can create up to 3 invoices total (lifetime cap, not monthly)
-- Pro users have unlimited invoices

-- 1. Add invoices_created_count column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS invoices_created_count INTEGER NOT NULL DEFAULT 0;

-- 2. Backfill existing invoice counts for all users
UPDATE profiles p
SET invoices_created_count = (
  SELECT COUNT(*) 
  FROM invoices i 
  WHERE i.user_id = p.id
)
WHERE EXISTS (
  SELECT 1 FROM invoices i WHERE i.user_id = p.id
);

-- 3. Create trigger function to increment counter on invoice creation
CREATE OR REPLACE FUNCTION increment_invoice_counter()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the lifetime counter (never decrements, even on delete)
  UPDATE profiles
  SET invoices_created_count = invoices_created_count + 1
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on invoice insert
DROP TRIGGER IF EXISTS increment_invoice_counter_trigger ON invoices;
CREATE TRIGGER increment_invoice_counter_trigger
AFTER INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION increment_invoice_counter();

-- 5. Drop existing invoice insert policy (we'll replace it with limit-aware version)
DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;

-- 6. Create new RLS policy with invoice limit enforcement
CREATE POLICY "Users can insert their own invoices with limits"
ON invoices
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- Pro users: unlimited invoices
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND plan IN ('pro_monthly', 'pro_yearly')
    )
    OR
    -- Free users: allow if under 3 total invoices created
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND plan = 'free'
      AND invoices_created_count < 3
    )
  )
);

-- 7. Add index for performance
CREATE INDEX IF NOT EXISTS profiles_invoices_created_count_idx 
ON profiles(invoices_created_count);

-- 8. Add helpful comments
COMMENT ON COLUMN profiles.invoices_created_count IS 'Lifetime count of invoices created (never decrements). Free plan limited to 3 total.';
COMMENT ON FUNCTION increment_invoice_counter IS 'Increments invoices_created_count on profiles when invoice is created';
COMMENT ON POLICY "Users can insert their own invoices with limits" ON invoices IS 'Enforces 3 invoice lifetime limit for free plan users';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Invoice free limit enforcement added!';
    RAISE NOTICE '   - Free plan: 3 invoices lifetime';
    RAISE NOTICE '   - Pro plan: unlimited invoices';
    RAISE NOTICE '   - Counter increments on create, never decrements';
END $$;
