# Apply Signup Fix Migration

Since there are multiple migrations with the same timestamp causing conflicts, please apply the fix migration manually:

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/jvostkeswuhfwntbrfzl/sql/new
2. Copy and paste the contents of `supabase/migrations/20251027_fix_handle_new_user.sql`
3. Click "Run" to execute the migration

## Option 2: Via Supabase CLI (if you have postgres tools installed)

```bash
# Install postgres client if needed
brew install postgresql

# Then run:
supabase db execute < supabase/migrations/20251027_fix_handle_new_user.sql
```

## What this fixes

The migration updates the `handle_new_user()` trigger function to:
- Properly set the search_path to find both `auth` and `public` schemas
- Add conflict handling so if a profile already exists, it updates instead of failing
- Ensure the trigger runs with SECURITY DEFINER privileges

This will fix the "Database error saving new user" issue when signing up.
