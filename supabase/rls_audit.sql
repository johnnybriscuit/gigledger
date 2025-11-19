-- RLS Policy Audit
-- Run this to verify Row Level Security is enabled and policies are correct
-- Date: 2025-11-19

\echo '=== RLS STATUS FOR USER TABLES ==='
\echo ''

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'expenses', 'incomes', 'gigs', 'payers', 'tax_profiles', 'mfa_factors', 'backup_codes', 'trusted_devices', 'security_events')
ORDER BY tablename;

\echo ''
\echo '=== POLICIES FOR USER TABLES ==='
\echo ''

-- List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'expenses', 'incomes', 'gigs', 'payers', 'tax_profiles', 'mfa_factors', 'backup_codes', 'trusted_devices', 'security_events')
ORDER BY tablename, policyname;

\echo ''
\echo '=== MISSING RLS (TABLES WITHOUT RLS ENABLED) ==='
\echo ''

SELECT 
  schemaname,
  tablename,
  'RLS NOT ENABLED - SECURITY RISK!' as warning
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'expenses', 'incomes', 'gigs', 'payers', 'tax_profiles', 'mfa_factors', 'backup_codes', 'trusted_devices', 'security_events')
  AND rowsecurity = false
ORDER BY tablename;

\echo ''
\echo '=== TABLES WITHOUT POLICIES (POTENTIAL ISSUE) ==='
\echo ''

SELECT 
  t.schemaname,
  t.tablename,
  'NO POLICIES DEFINED - CHECK IF INTENTIONAL' as warning
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN ('profiles', 'expenses', 'incomes', 'gigs', 'payers', 'tax_profiles', 'mfa_factors', 'backup_codes', 'trusted_devices', 'security_events')
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 
    FROM pg_policies p 
    WHERE p.schemaname = t.schemaname 
      AND p.tablename = t.tablename
  )
ORDER BY t.tablename;

\echo ''
\echo '=== RECOMMENDED POLICY TEMPLATE ==='
\echo ''
\echo 'For user-scoped tables, use this pattern:'
\echo ''
\echo '-- Enable RLS'
\echo 'alter table public.TABLE_NAME enable row level security;'
\echo ''
\echo '-- SELECT policy'
\echo 'drop policy if exists "TABLE_sel" on public.TABLE_NAME;'
\echo 'create policy "TABLE_sel" on public.TABLE_NAME'
\echo '  for select using (user_id = auth.uid());'
\echo ''
\echo '-- INSERT policy'
\echo 'drop policy if exists "TABLE_ins" on public.TABLE_NAME;'
\echo 'create policy "TABLE_ins" on public.TABLE_NAME'
\echo '  for insert with check (user_id = auth.uid());'
\echo ''
\echo '-- UPDATE policy'
\echo 'drop policy if exists "TABLE_upd" on public.TABLE_NAME;'
\echo 'create policy "TABLE_upd" on public.TABLE_NAME'
\echo '  for update using (user_id = auth.uid());'
\echo ''
\echo '-- DELETE policy'
\echo 'drop policy if exists "TABLE_del" on public.TABLE_NAME;'
\echo 'create policy "TABLE_del" on public.TABLE_NAME'
\echo '  for delete using (user_id = auth.uid());'
\echo ''
