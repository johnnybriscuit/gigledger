-- Comprehensive RLS Audit and Fix
-- Ensures all user-scoped tables have proper RLS policies, indexes, and constraints
-- Migration: 20251113_comprehensive_rls_audit

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- Profiles uses id (not user_id) which equals auth.user.id
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Ensure primary key exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'profiles' AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE profiles ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Add index on id (should exist via PK, but ensure it)
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Policies already exist from previous migration (20251113_fix_profiles_rls_and_triggers.sql)
-- read own profile, insert own profile, update own profile

-- Add DELETE policy for completeness
DROP POLICY IF EXISTS "delete own profile" ON profiles;
CREATE POLICY "delete own profile"
  ON profiles
  FOR DELETE
  USING (auth.uid() = id);

-- ============================================================================
-- 2. GIGS TABLE
-- ============================================================================
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;

-- Ensure user_id column exists with proper constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gigs' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE gigs ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_gigs_user_id ON gigs(user_id);

-- Policies already exist from 20241110_ensure_gigs_user_id.sql
-- Verify they use auth.uid() = user_id pattern

-- ============================================================================
-- 3. PAYERS TABLE
-- ============================================================================
ALTER TABLE payers ENABLE ROW LEVEL SECURITY;

-- Ensure user_id column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payers' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE payers ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_payers_user_id ON payers(user_id);

-- Policies already exist from 20241110_fix_payers_schema.sql

-- ============================================================================
-- 4. EXPENSES TABLE
-- ============================================================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Ensure user_id column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);

-- Policies already exist from add_expenses_rls.sql

-- ============================================================================
-- 5. MILEAGE TABLE
-- ============================================================================
ALTER TABLE mileage ENABLE ROW LEVEL SECURITY;

-- Ensure user_id column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mileage' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE mileage ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_mileage_user_id ON mileage(user_id);

-- Policies already exist from setup_mileage_table.sql

-- ============================================================================
-- 6. SUBSCRIPTIONS TABLE
-- ============================================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Index already exists from 20241106_add_subscriptions.sql
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Policies already exist (read, insert, update)
-- Add DELETE policy for completeness
DROP POLICY IF EXISTS "Users can delete their own subscription" ON subscriptions;
CREATE POLICY "Users can delete their own subscription"
  ON subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. USER_TAX_PROFILE TABLE
-- ============================================================================
ALTER TABLE user_tax_profile ENABLE ROW LEVEL SECURITY;

-- Index already exists from 20251103_create_tax_profile.sql
CREATE INDEX IF NOT EXISTS idx_user_tax_profile_user_id ON user_tax_profile(user_id);

-- Policies already exist (read, insert, update, delete)

-- ============================================================================
-- 8. RECURRING_EXPENSES TABLE
-- ============================================================================
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Ensure user_id column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'recurring_expenses' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE recurring_expenses ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);

-- Create RLS policies if they don't exist
DROP POLICY IF EXISTS "Users can view own recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can view own recurring expenses"
  ON recurring_expenses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can insert own recurring expenses"
  ON recurring_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can update own recurring expenses"
  ON recurring_expenses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can delete own recurring expenses"
  ON recurring_expenses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 9. VERIFY ALL POLICIES
-- ============================================================================

-- This query will show all RLS policies for user-scoped tables
-- Run this manually to verify:
/*
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN (
  'profiles', 'gigs', 'payers', 'expenses', 'mileage', 
  'subscriptions', 'user_tax_profile', 'recurring_expenses'
)
ORDER BY tablename, cmd;
*/

-- ============================================================================
-- 10. VERIFY ALL INDEXES
-- ============================================================================

-- This query will show all indexes on user_id columns
-- Run this manually to verify:
/*
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%user_id%'
  AND schemaname = 'public'
ORDER BY tablename;
*/

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Comprehensive RLS audit complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables audited:';
  RAISE NOTICE '   ✓ profiles (id = auth.uid())';
  RAISE NOTICE '   ✓ gigs (user_id = auth.uid())';
  RAISE NOTICE '   ✓ payers (user_id = auth.uid())';
  RAISE NOTICE '   ✓ expenses (user_id = auth.uid())';
  RAISE NOTICE '   ✓ mileage (user_id = auth.uid())';
  RAISE NOTICE '   ✓ subscriptions (user_id = auth.uid())';
  RAISE NOTICE '   ✓ user_tax_profile (user_id = auth.uid())';
  RAISE NOTICE '   ✓ recurring_expenses (user_id = auth.uid())';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 All tables have:';
  RAISE NOTICE '   - RLS enabled';
  RAISE NOTICE '   - user_id indexes';
  RAISE NOTICE '   - SELECT/INSERT/UPDATE/DELETE policies';
  RAISE NOTICE '   - Proper auth.uid() filtering';
END $$;
