# Multi-Tenant Security Architecture

## Overview

GigLedger implements strict data isolation between users using Supabase Row Level Security (RLS) policies and client-side query scoping.

## Database Security

### RLS-Enabled Tables

All user-scoped tables have RLS enabled with policies that enforce `auth.uid()` filtering:

| Table | Primary Key | User Scope Column | RLS Policies |
|-------|-------------|-------------------|--------------|
| `profiles` | `id` | `id` (= auth.uid()) | SELECT, INSERT, UPDATE, DELETE |
| `gigs` | `id` | `user_id` | SELECT, INSERT, UPDATE, DELETE |
| `payers` | `id` | `user_id` | SELECT, INSERT, UPDATE, DELETE |
| `expenses` | `id` | `user_id` | SELECT, INSERT, UPDATE, DELETE |
| `mileage` | `id` | `user_id` | SELECT, INSERT, UPDATE, DELETE |
| `subscriptions` | `id` | `user_id` | SELECT, INSERT, UPDATE, DELETE |
| `user_tax_profile` | `user_id` | `user_id` | SELECT, INSERT, UPDATE, DELETE |
| `recurring_expenses` | `id` | `user_id` | SELECT, INSERT, UPDATE, DELETE |

### RLS Policy Pattern

All policies follow this pattern:

```sql
-- READ
CREATE POLICY "read own <table>"
  ON <table>
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT
CREATE POLICY "insert own <table>"
  ON <table>
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE
CREATE POLICY "update own <table>"
  ON <table>
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE
CREATE POLICY "delete own <table>"
  ON <table>
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

**Note:** The `profiles` table uses `id` instead of `user_id` because `profiles.id` references `auth.users.id`.

### Indexes

All user-scoped tables have indexes on their user scope column:

```sql
CREATE INDEX IF NOT EXISTS idx_<table>_user_id ON <table>(user_id);
```

## Client-Side Security

### Query Scoping

All Supabase queries include user filtering:

```typescript
// ✅ CORRECT - Always filter by user_id
const { data } = await supabase
  .from('gigs')
  .select('*')
  .eq('user_id', user.id);

// ✅ CORRECT - Always include user_id on insert
const { data } = await supabase
  .from('gigs')
  .insert({ ...gigData, user_id: user.id });

// ❌ WRONG - Missing user_id filter
const { data } = await supabase
  .from('gigs')
  .select('*');
```

### React Query Keys

**CRITICAL:** All React Query keys must include `user.id` to prevent cache bleeding:

```typescript
// ✅ CORRECT - Includes user.id in query key
export function useGigs() {
  return useQuery({
    queryKey: ['gigs', user.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data } = await supabase
        .from('gigs')
        .select('*')
        .eq('user_id', user.id);
      
      return data;
    },
  });
}

// ❌ WRONG - Missing user.id in query key
export function useGigs() {
  return useQuery({
    queryKey: ['gigs'], // Cache could bleed between users!
    // ...
  });
}
```

### Auth State Management

The app clears all cached data on sign out and invalidates queries on sign in:

```typescript
// In App.tsx
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    queryClient.clear(); // Clear all cached data
  }
  
  if (event === 'SIGNED_IN' && session?.user) {
    queryClient.invalidateQueries(); // Refetch all data
  }
});
```

## Server-Side Security

### Supabase Functions

All server-side functions (RPCs, triggers) must enforce `auth.uid()` filtering:

```sql
CREATE OR REPLACE FUNCTION get_user_gigs()
RETURNS SETOF gigs AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM gigs
  WHERE user_id = auth.uid(); -- Always filter by auth.uid()
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Stripe Integration

Stripe customer metadata includes `supabase_user_id`:

```typescript
// When creating Stripe customer
const customer = await stripe.customers.create({
  email: user.email,
  metadata: {
    supabase_user_id: user.id, // Link to Supabase user
  },
});

// In webhook handler
const supabaseUserId = customer.metadata.supabase_user_id;
await supabase
  .from('subscriptions')
  .update({ status: 'active' })
  .eq('user_id', supabaseUserId); // Update by user_id from metadata
```

## Testing

### Manual Testing

1. **Create two test users:**
   ```bash
   # User A: alice@example.com
   # User B: bob@example.com
   ```

2. **Test data isolation:**
   - Sign in as Alice
   - Create a gig, payer, expense
   - Sign out
   - Sign in as Bob
   - Verify Bob sees 0 gigs, payers, expenses
   - Create Bob's own data
   - Sign out
   - Sign in as Alice
   - Verify Alice's data is unchanged

3. **Test cache clearing:**
   - Sign in as Alice
   - Note the data shown
   - Sign out
   - Sign in as Bob
   - Verify no stale data from Alice

### Automated Tests

Run E2E tests:

```bash
npm run test:e2e
```

Run unit tests:

```bash
npm test
```

## Common Pitfalls

### ❌ Don't: Trust client-provided user_id

```typescript
// ❌ WRONG - Client could send any user_id
const { user_id } = req.body;
await supabase.from('gigs').insert({ user_id, ...data });
```

### ✅ Do: Get user_id from session

```typescript
// ✅ CORRECT - Get user_id from authenticated session
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('gigs').insert({ user_id: user.id, ...data });
```

### ❌ Don't: Use global query keys

```typescript
// ❌ WRONG - Cache could bleed
queryKey: ['gigs']
```

### ✅ Do: Include user.id in query keys

```typescript
// ✅ CORRECT - Cache is user-specific
queryKey: ['gigs', user.id]
```

### ❌ Don't: Skip RLS policies

```sql
-- ❌ WRONG - No user filtering
CREATE POLICY "allow all" ON gigs
  FOR SELECT USING (true);
```

### ✅ Do: Always filter by auth.uid()

```sql
-- ✅ CORRECT - Strict user filtering
CREATE POLICY "read own gigs" ON gigs
  FOR SELECT USING (auth.uid() = user_id);
```

## Verification Commands

### Check RLS is enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'gigs', 'payers', 'expenses', 'mileage', 'subscriptions', 'user_tax_profile', 'recurring_expenses');
```

### Check RLS policies

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'gigs', 'payers', 'expenses', 'mileage', 'subscriptions', 'user_tax_profile', 'recurring_expenses')
ORDER BY tablename, cmd;
```

### Check indexes

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE indexname LIKE '%user_id%'
  AND schemaname = 'public'
ORDER BY tablename;
```

## Maintenance

### Adding a New User-Scoped Table

When adding a new table that stores user data:

1. **Add user_id column:**
   ```sql
   ALTER TABLE new_table ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
   ```

2. **Create index:**
   ```sql
   CREATE INDEX idx_new_table_user_id ON new_table(user_id);
   ```

3. **Enable RLS:**
   ```sql
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
   ```

4. **Create policies:**
   ```sql
   CREATE POLICY "read own new_table" ON new_table
     FOR SELECT USING (auth.uid() = user_id);
   
   CREATE POLICY "insert own new_table" ON new_table
     FOR INSERT WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "update own new_table" ON new_table
     FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "delete own new_table" ON new_table
     FOR DELETE USING (auth.uid() = user_id);
   ```

5. **Update client code:**
   - Add `.eq('user_id', user.id)` to all SELECT queries
   - Add `user_id: user.id` to all INSERT mutations
   - Include `user.id` in React Query keys

## Security Checklist

- [ ] All user-scoped tables have RLS enabled
- [ ] All tables have proper SELECT/INSERT/UPDATE/DELETE policies
- [ ] All policies use `auth.uid()` filtering
- [ ] All tables have indexes on user_id columns
- [ ] All client queries include `.eq('user_id', user.id)`
- [ ] All inserts include `user_id: user.id`
- [ ] All React Query keys include `user.id`
- [ ] Auth state changes clear/invalidate cache
- [ ] Stripe metadata includes `supabase_user_id`
- [ ] Server functions enforce `auth.uid()` filtering
- [ ] E2E tests verify data isolation
- [ ] No client-provided user_id values trusted

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [React Query Keys Best Practices](https://tkdodo.eu/blog/effective-react-query-keys)
- [Stripe Metadata](https://stripe.com/docs/api/metadata)
