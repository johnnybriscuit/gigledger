# Tour/Run Feature - Implementation Guide

## Overview

The Tour/Run feature allows users to group multiple gigs together into tours, track tour-level payments (settlements), manage shared expenses, and view comprehensive tour P&L summaries.

## Database Schema

### New Tables

#### 1. `tour_runs`
Stores tour/run information.

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- name: TEXT (required)
- artist_name: TEXT (optional)
- notes: TEXT (optional)
- start_date: DATE (computed from gigs, can be manually set)
- end_date: DATE (computed from gigs, can be manually set)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 2. `settlements`
Tour-level payouts that can be allocated across gigs.

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- tour_id: UUID (references tour_runs, nullable)
- amount: NUMERIC(12,2) (required, >= 0)
- paid_at: DATE (optional)
- payer_name: TEXT (optional)
- notes: TEXT (optional)
- allocation_mode: TEXT (even|custom|weighted|none, default: even)
- allocation_json: JSONB (stores per-gig allocations)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Modified Tables

#### `gigs`
Added `tour_id` column:
```sql
- tour_id: UUID (references tour_runs, nullable, ON DELETE SET NULL)
```

#### `expenses`
Added tour-related columns:
```sql
- tour_id: UUID (references tour_runs, nullable, ON DELETE CASCADE)
- allocation_mode: TEXT (even|custom|weighted|none, default: none)
- allocation_json: JSONB (stores per-gig expense allocations)
```

## Allocation Modes

### 1. **Even** (Default)
Distributes amount equally across all gigs in the tour.

**Example:** $1,000 settlement across 4 gigs = $250 per gig

### 2. **Custom**
User manually specifies the amount for each gig.

**Example:** 
- Gig 1: $400
- Gig 2: $300
- Gig 3: $200
- Gig 4: $100

### 3. **Weighted**
Distributes amount proportionally based on each gig's guarantee (gross_amount).

**Example:** 
- Gig 1 guarantee: $500 → receives 50% of settlement
- Gig 2 guarantee: $300 → receives 30% of settlement
- Gig 3 guarantee: $200 → receives 20% of settlement

If total weight is 0, falls back to "even" mode.

### 4. **None**
Settlement/expense stays at tour level only, no per-gig allocation.

## Key Features

### 1. Retroactive Grouping
Users can select existing gigs and add them to a tour:
- Create tour first
- Use "Add Gigs" button to select from ungrouped gigs
- Multi-select with search/filter
- Gigs can only belong to one tour at a time

### 2. Tour-Level Settlements
Track payments that cover multiple gigs:
- Add settlement with total amount
- Choose allocation mode
- System calculates per-gig distribution
- Stored in `allocation_json` for stable exports

### 3. Tour-Level Expenses
Track shared costs across the tour:
- Hotel rooms, transportation, equipment rental
- Allocate using same modes as settlements
- Per-gig breakdown available

### 4. Tour P&L Summary
Comprehensive financial view:
- **Gross:** Sum of all allocated settlement income
- **Expenses:** Tour expenses + gig-specific expenses
- **Net:** Gross - Expenses
- Per-gig breakdown showing allocated income, shared expenses, and net

## File Structure

### Migrations
```
/supabase/migrations/20260212_create_tours_and_settlements.sql
```

### Types
```
/src/types/tours.types.ts
```
- TourRun, TourRunInsert, TourRunUpdate
- Settlement, SettlementInsert, SettlementUpdate
- AllocationMode, AllocationJson
- TourWithGigs, TourSummary, TourFinancials

### Utilities
```
/src/utils/tourAllocations.ts
```
- `calculateAllocation()` - Compute allocation based on mode
- `generateAllocationPreview()` - Preview for UI
- `buildTourFinancials()` - Calculate tour P&L
- `validateCustomAllocations()` - Ensure custom allocations sum correctly
- `getAllocationModeLabel()` - Display labels

### Hooks
```
/src/hooks/useTours.ts
```
- `useTours()` - Fetch all tours
- `useTour(tourId)` - Fetch single tour with gigs
- `useCreateTour()` - Create new tour
- `useUpdateTour()` - Update tour details
- `useDeleteTour()` - Delete tour (gigs are ungrouped, not deleted)
- `useAddGigsToTour()` - Add gigs to tour
- `useRemoveGigFromTour()` - Remove gig from tour

```
/src/hooks/useSettlements.ts
```
- `useSettlements(tourId)` - Fetch settlements for tour
- `useCreateSettlement()` - Create new settlement
- `useUpdateSettlement()` - Update settlement
- `useDeleteSettlement()` - Delete settlement

### UI Components
```
/src/screens/ToursScreen.tsx
```
- Tours list view
- Create tour button
- Tour cards with summary info

```
/src/screens/TourDetailScreen.tsx
```
- Tour header with name, artist, dates
- P&L summary card
- Gigs list with per-gig net
- Settlements section
- Tour expenses section

```
/src/components/tours/CreateTourModal.tsx
```
- Modal to create new tour
- Fields: name (required), artist_name, notes

```
/src/components/tours/AddGigsToTourModal.tsx
```
- Multi-select gig picker
- Search/filter functionality
- Shows only ungrouped gigs

## Usage Workflow

### Creating a Tour

1. Navigate to Tours screen
2. Click "Create Tour"
3. Enter tour name (required)
4. Optionally add artist name and notes
5. Click "Create Tour"

### Adding Gigs to Tour

**Option 1: From Tour Detail**
1. Open tour detail page
2. Click "Add Gigs" button
3. Search/select gigs from list
4. Click "Add X Gigs"

**Option 2: From Gig Page** (to be implemented)
1. Edit gig
2. Select tour from dropdown
3. Save

### Adding Settlements

1. Open tour detail page
2. Click "Add Settlement" in Settlements section
3. Enter amount, payer name, date
4. Choose allocation mode:
   - Even: Auto-split equally
   - Weighted: Auto-split by guarantee
   - Custom: Manually enter per-gig amounts
   - None: Keep at tour level only
5. Preview allocation
6. Save

### Viewing Tour Financials

Tour Detail page shows:
- **Tour Summary Card:**
  - Number of gigs
  - Total gross income
  - Total expenses
  - Net profit/loss

- **Per-Gig Breakdown:**
  - Each gig shows its net after allocation
  - Click gig to see detail

## Edge Cases Handled

1. **Tour with 0 gigs:** Shows empty state
2. **Gig removed from tour:** Allocations remain but show warning to recalculate
3. **Weighted mode with no guarantees:** Falls back to even split
4. **Custom allocations don't sum to total:** Validation error shown
5. **Deleting tour:** Gigs are ungrouped (tour_id set to NULL), not deleted
6. **Gig already in tour:** Cannot be added to another tour

## RLS Policies

All tables have standard user-scoped RLS:
- Users can only view/edit/delete their own tours
- Users can only view/edit/delete their own settlements
- Gig tour_id updates restricted to user's own gigs
- Expense tour_id updates restricted to user's own expenses

## Database Triggers

### Auto-update Tour Date Range
When a gig is added/updated with a tour_id:
- Tour's start_date is set to MIN(gig dates) if NULL
- Tour's end_date is set to MAX(gig dates) if NULL
- User can manually override these dates

## Next Steps / Future Enhancements

### Not Yet Implemented (from original spec):

1. **AddSettlementModal component** - Settlement creation UI with allocation preview
2. **Tour assignment dropdown on gig pages** - Quick assign/unassign from gig edit
3. **Tour expense management** - UI to add/edit tour-level expenses
4. **Navigation integration** - Add Tours to main navigation
5. **Invoice compatibility** - Ensure tour allocations work with existing invoice/export system

### Recommended Additions:

1. **Tour templates** - Save tour structure for recurring tours
2. **Tour duplication** - Clone tour structure for new dates
3. **Tour analytics** - Compare tours, track trends
4. **Export tour report** - PDF/CSV export of tour P&L
5. **Tour calendar view** - Visual timeline of tour dates
6. **Settlement reminders** - Track unpaid settlements
7. **Multi-currency support** - For international tours

## Testing Checklist

- [ ] Create tour with valid data
- [ ] Create tour with missing required fields (should fail)
- [ ] Add gigs to tour
- [ ] Remove gigs from tour
- [ ] Create settlement with even allocation
- [ ] Create settlement with weighted allocation
- [ ] Create settlement with custom allocation
- [ ] Verify tour P&L calculations
- [ ] Delete tour (verify gigs are ungrouped)
- [ ] Verify RLS policies (users can't see other users' tours)
- [ ] Test with 0 gigs in tour
- [ ] Test with 1 gig in tour
- [ ] Test with many gigs (50+)

## Migration Instructions

### Running the Migration

```bash
# Apply migration to Supabase
supabase db push

# Or via SQL editor in Supabase dashboard
# Copy contents of 20260212_create_tours_and_settlements.sql
```

### Regenerating TypeScript Types

After running the migration, regenerate database types:

```bash
# Generate types from Supabase
supabase gen types typescript --local > src/types/database.types.ts

# Or from remote
supabase gen types typescript --project-ref YOUR_PROJECT_REF > src/types/database.types.ts
```

### Post-Migration Steps

1. Update `database.types.ts` with new table types
2. Verify RLS policies are active
3. Test tour creation in development
4. Verify triggers are working (tour date auto-update)
5. Test allocation calculations
6. Add Tours to navigation menu

## API Patterns

All tour operations use standard Supabase client with RLS:

```typescript
// Create tour
const { data, error } = await supabase
  .from('tour_runs')
  .insert({ name, artist_name, notes, user_id })
  .select()
  .single();

// Fetch tour with gigs
const { data, error } = await supabase
  .from('tour_runs')
  .select(`
    *,
    gigs(*),
    settlements(*),
    tour_expenses:expenses!expenses_tour_id_fkey(*)
  `)
  .eq('id', tourId)
  .single();

// Add gigs to tour
const { error } = await supabase
  .from('gigs')
  .update({ tour_id: tourId })
  .in('id', gigIds)
  .eq('user_id', userId);
```

## Performance Considerations

- Indexes added on `gigs(user_id, tour_id)` and `expenses(user_id, tour_id)`
- View `v_tour_summary` provides pre-aggregated tour stats
- Allocation calculations done client-side for flexibility
- Consider caching tour financials for large tours (100+ gigs)

## Support & Troubleshooting

### Common Issues

**Issue:** Tour dates not updating automatically
- **Solution:** Check trigger is active: `update_tour_dates_on_gig_change`

**Issue:** Allocations don't sum to settlement amount
- **Solution:** Use validation helper before saving custom allocations

**Issue:** Can't add gig to tour
- **Solution:** Verify gig doesn't already have a tour_id

**Issue:** TypeScript errors on settlements table
- **Solution:** Regenerate database types after migration

---

**Implementation Date:** February 12, 2026  
**Version:** 1.0  
**Status:** Core features implemented, UI components in progress
