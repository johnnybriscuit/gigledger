# Tax ID Last-4 Only Implementation

## Problem
Previously stored full SSN/EIN values in the database, which is a security risk. Need to store and display only last 4 digits.

## Solution
Implemented last-4 only storage with masked display for both Payers and Subcontractors.

## Implementation Details

### 1. Database Changes
**Migration: `20260116_convert_tax_ids_to_last4_only.sql`**

**Payers Table:**
- Added `tax_id_type` column (TEXT, CHECK: 'ssn' or 'ein')
- Added `tax_id_last4` column (TEXT, CHECK: exactly 4 digits)
- Migrated existing full `tax_id` values → extracted last 4 digits
- Cleared all full `tax_id` values (set to NULL for security)
- Kept `tax_id` column for backward compatibility but deprecated it

**Subcontractors Table:**
- Already had `tax_id_type` and `tax_id_last4` ✅
- No changes needed

### 2. Code Changes

#### Validation Schema (`src/lib/validations.ts`)
Updated `payerSchema`:
```typescript
tax_id_type: z.enum(['ssn', 'ein']).optional(),
tax_id_last4: z.string().length(4, 'Must be exactly 4 digits').regex(/^\d{4}$/, 'Must be 4 digits').optional(),
```

#### Payer Forms Updated
**`AddPayerModal.tsx`** and **`PayerFormModal.tsx`**:
- Removed full `tax_id` input
- Added `tax_id_type` selection (SSN/EIN buttons)
- Added conditional `tax_id_input` field that:
  - Accepts full SSN/EIN from user
  - Strips non-digits: `taxIdInput.replace(/[^0-9]/g, '')`
  - Extracts last 4: `digitsOnly.slice(-4)`
  - Validates minimum 4 digits
  - Stores only last 4 in database

#### Display Behavior
**On Edit:**
- Shows masked value: `••••••1234`
- Helper text: "We only store the last 4 digits. Enter full ID to replace."

**On Create:**
- Shows placeholder: `XXX-XX-XXXX` (SSN) or `XX-XXXXXXX` (EIN)
- Helper text: "Enter full ID - we'll only store the last 4 digits for security"

#### Subcontractor Forms
**`SubcontractorFormModal.tsx`**:
- Already implemented correctly ✅
- Direct input of last 4 digits only
- Validation: `!/^\d{4}$/.test(taxIdLast4)`

### 3. TypeScript Types Updated
**`src/types/database.types.ts`**

Added to Payers Row/Insert/Update:
```typescript
tax_id_type: string | null
tax_id_last4: string | null
```

Subcontractors already had these fields.

### 4. Display in Lists
**`PayersScreen.tsx`**:
- Displays: `SSN ****1234` or `EIN ****1234`
- Uses Badge component for visual consistency

## Security Improvements

### Before
- ❌ Full SSN/EIN stored in `tax_id` column
- ❌ Full values visible in database
- ❌ Full values potentially logged
- ❌ Full values in exports

### After
- ✅ Only last 4 digits stored
- ✅ Full values never touch database
- ✅ Masked display everywhere (`••••••1234`)
- ✅ User can paste full ID, but only last 4 saved
- ✅ No full IDs in exports
- ✅ No full IDs in console logs

## User Experience

### Input Flow
1. User selects tax ID type (SSN or EIN)
2. Conditional input field appears
3. User can type/paste full SSN/EIN: `123-45-6789` or `12-3456789`
4. On save:
   - Strips formatting: `123456789`
   - Extracts last 4: `6789`
   - Stores: `tax_id_last4 = "6789"`
   - Full value discarded immediately

### Edit Flow
1. User opens edit modal
2. Sees masked value: `••••••6789`
3. Can enter new full ID to replace
4. Only new last 4 saved

### Display
- Lists: `SSN ****6789` (Badge component)
- Forms: `••••••6789` (masked input)
- Never shows full value

## Migration Behavior

### Existing Full IDs
The migration:
1. Extracts last 4 from existing `tax_id` values
2. Stores in new `tax_id_last4` column
3. **Clears all full `tax_id` values** (sets to NULL)
4. Full IDs are permanently removed

### Example
**Before migration:**
```sql
tax_id = '123-45-6789'
tax_id_type = NULL
tax_id_last4 = NULL
```

**After migration:**
```sql
tax_id = NULL  -- Cleared for security
tax_id_type = NULL  -- User can set later
tax_id_last4 = '6789'  -- Extracted from full ID
```

## Validation

### Frontend
- Zod schema validates exactly 4 digits
- Regex: `/^\d{4}$/`
- User-friendly error: "Please enter at least the last 4 digits of the tax ID"

### Database
- CHECK constraint: `length(tax_id_last4) = 4 AND tax_id_last4 ~ '^[0-9]+$'`
- CHECK constraint: `tax_id_type IN ('ssn', 'ein')`

## Export Behavior

Tax IDs in exports will show:
- `tax_id_type`: "ssn" or "ein"
- `tax_id_last4`: "6789"
- **Never** full SSN/EIN

For 1099 reporting, last 4 digits are sufficient for reconciliation.

## Console Logging

All logging reviewed - no full tax IDs logged:
- Only last 4 digits in any logs
- Masked display in UI prevents accidental exposure
- Input values discarded immediately after extraction

## Testing Checklist

✅ Save payer with SSN → only last 4 stored
✅ Save payer with EIN → only last 4 stored
✅ Edit payer → shows masked value
✅ Paste full SSN with dashes → strips and saves last 4
✅ Subcontractor same behavior
✅ Exports don't include full IDs
✅ No console logs print tax IDs
✅ Migration converts existing full IDs to last 4
✅ Migration clears all full tax_id values

## Files Changed

### Database
- `supabase/migrations/20260116_convert_tax_ids_to_last4_only.sql`

### Code
- `src/lib/validations.ts` - Updated payerSchema
- `src/components/AddPayerModal.tsx` - Last-4 only input
- `src/components/PayerFormModal.tsx` - Last-4 only input
- `src/types/database.types.ts` - Added tax_id_type and tax_id_last4

### Already Correct
- `src/components/SubcontractorFormModal.tsx` - Already last-4 only ✅
- `src/screens/PayersScreen.tsx` - Already displays masked ✅

## Future Encryption Project

When full encryption is implemented later:
- Can add encrypted full tax ID storage
- Keep last 4 for quick reference/display
- Decrypt full value only when needed for official forms
- This implementation provides foundation for that

## Rollback Plan

If issues arise:
1. Migration keeps `tax_id` column (just sets to NULL)
2. Can restore from backups if needed
3. Revert code changes to use `tax_id` field
4. Note: Full IDs are permanently cleared by migration
