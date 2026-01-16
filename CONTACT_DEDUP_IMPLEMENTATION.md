# Contact De-Duplication Implementation

## Problem
Users were creating duplicate contacts (Payers/Subcontractors) with slightly different casing or spacing:
- "Johnny brisket" vs "Johnny Brisket"
- "Blue Note Jazz Club" vs "blue note jazz club"

This caused:
- Cluttered contact lists
- Difficulty tracking relationships with the same entity
- Potential reporting issues

## Solution
Implemented name-only matching with normalized names and upsert behavior to prevent duplicates.

## Implementation Details

### 1. Database Changes
**Migration: `20260116_add_normalized_name_dedup.sql`**

Added `normalized_name` column to both `payers` and `subcontractors` tables:
- Stores `lower(trim(name))` for case-insensitive matching
- Automatically set via database triggers on insert/update
- NOT NULL constraint after backfilling existing data

Added unique constraints:
```sql
CREATE UNIQUE INDEX payers_user_id_normalized_name_unique
ON payers(user_id, normalized_name);

CREATE UNIQUE INDEX subcontractors_user_id_normalized_name_unique
ON subcontractors(user_id, normalized_name);
```

Database triggers automatically maintain `normalized_name`:
- `set_payers_normalized_name()` - Triggers on INSERT or UPDATE of name
- `set_subcontractors_normalized_name()` - Triggers on INSERT or UPDATE of name

### 2. Code Changes

#### Hooks Updated
**`src/hooks/usePayers.ts`**
- Changed `useCreatePayer` from `.insert()` to `.upsert()`
- Uses `onConflict: 'user_id,normalized_name'`
- `ignoreDuplicates: false` ensures existing records are updated

**`src/hooks/useSubcontractors.ts`**
- Changed `useCreateSubcontractor` from `.insert()` to `.upsert()`
- Uses `onConflict: 'user_id,normalized_name'`
- `ignoreDuplicates: false` ensures existing records are updated

#### TypeScript Types Updated
**`src/types/database.types.ts`**
- Added `normalized_name: string` to Row types
- Added `normalized_name?: string` to Insert types (optional, set by trigger)
- Added `normalized_name?: string` to Update types

### 3. Behavior

#### On Contact Creation
When a user creates a contact:
1. Frontend calls `useCreatePayer` or `useCreateSubcontractor`
2. Hook calls Supabase `.upsert()` with the contact data
3. Database trigger automatically sets `normalized_name = lower(trim(name))`
4. Unique constraint checks for existing `(user_id, normalized_name)` pair
5. If match found: **Updates existing record** with new data
6. If no match: **Inserts new record**

#### User Experience
- **Silent update**: If user enters "Johnny Brisket" and "Johnny brisket" already exists, the existing record is updated
- **No error messages**: No duplicate key violations shown to user
- **Seamless**: Works across all contact creation flows:
  - Onboarding payer step
  - Contacts screen "Add Payer" button
  - "Add Payer" from within AddGig modal
  - "Add Subcontractor" from within AddGig modal
  - Contacts screen "Add Subcontractor" button

### 4. Affected Components

All these components automatically benefit from the upsert logic:
- `OnboardingAddPayer.tsx` - Uses `useCreatePayer`
- `AddPayerModal.tsx` - Uses `useCreatePayer`
- `PayerFormModal.tsx` - Uses `useCreatePayer`
- `SubcontractorFormModal.tsx` - Uses `useCreateSubcontractor`
- `PayersScreen.tsx` - Uses both hooks
- `AddGigModal.tsx` - Uses `PayerFormModal` and `SubcontractorFormModal`

No changes needed to these components - they automatically use the updated hooks.

### 5. Data Migration

The migration:
1. Adds `normalized_name` column (nullable initially)
2. Backfills existing records: `UPDATE ... SET normalized_name = lower(trim(name))`
3. Makes column NOT NULL after backfill
4. Creates unique indexes
5. Adds triggers for automatic maintenance

**No manual de-duplication**: Existing duplicates are NOT automatically merged. Users can manually delete duplicates if desired, or we can create a separate migration later.

## Testing Checklist

✅ Create payer "Johnny brisket"
✅ Create payer "Johnny Brisket" → Should update same record, not create duplicate
✅ Verify gig creation attaches to correct payer
✅ Create subcontractor "John Smith"
✅ Create subcontractor "john smith" → Should update same record
✅ Verify subcontractor payment attaches correctly
✅ Edit existing payer → Still works
✅ Edit existing subcontractor → Still works
✅ Onboarding flow creates payer → Works with upsert
✅ Delete payer with gigs → Still blocked (existing validation)

## Edge Cases Handled

1. **Whitespace**: `"  Johnny  "` and `"Johnny"` are treated as same (trimmed)
2. **Case**: `"JOHNNY"` and `"johnny"` are treated as same (lowercased)
3. **Mixed**: `"  Johnny Brisket  "` and `"johnny brisket"` are treated as same
4. **Update on conflict**: If user re-enters same name with different details (email, type, etc.), those details are updated
5. **User isolation**: Constraint is per-user (`user_id, normalized_name`), so different users can have same contact names

## Database Schema

### Payers Table
```sql
CREATE TABLE payers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,  -- NEW
  payer_type payer_type NOT NULL,
  contact_email TEXT,
  notes TEXT,
  expect_1099 BOOLEAN,
  tax_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE (user_id, normalized_name)  -- NEW
);
```

### Subcontractors Table
```sql
CREATE TABLE subcontractors (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,  -- NEW
  role TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id_type TEXT,
  tax_id_last4 TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE (user_id, normalized_name)  -- NEW
);
```

## Performance Considerations

- Unique indexes on `(user_id, normalized_name)` provide fast lookup
- Triggers add minimal overhead (simple string operations)
- Upsert is atomic - no race conditions
- Existing indexes on `user_id` remain for other queries

## Future Enhancements

1. **Duplicate cleanup migration**: Create a migration to merge existing duplicates
2. **UI feedback**: Optionally show "Updated existing contact: [name]" toast
3. **Fuzzy matching**: Consider Levenshtein distance for typos ("Johny" vs "Johnny")
4. **Merge UI**: Add UI to manually merge duplicate contacts if needed

## Rollback Plan

If issues arise:
1. Drop unique indexes: `DROP INDEX payers_user_id_normalized_name_unique`
2. Drop triggers: `DROP TRIGGER payers_set_normalized_name ON payers`
3. Revert hooks to use `.insert()` instead of `.upsert()`
4. Column can remain (won't cause issues, just unused)
