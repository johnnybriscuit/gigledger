# Tour/Run Feature - Implementation Summary

## Completed Components

### ✅ Database Layer
- **Migration File:** `/supabase/migrations/20260212_create_tours_and_settlements.sql`
  - Created `tour_runs` table
  - Created `settlements` table
  - Added `tour_id` to `gigs` table
  - Extended `expenses` table with `tour_id` and allocation columns
  - Added RLS policies for all new tables
  - Created triggers for auto-updating tour date ranges
  - Created `v_tour_summary` view for aggregated data

### ✅ TypeScript Types
- **File:** `/src/types/tours.types.ts`
  - TourRun, Settlement type definitions
  - AllocationMode enum type
  - TourWithGigs, TourSummary, TourFinancials interfaces
  - GigAllocationPreview interface

### ✅ Business Logic
- **File:** `/src/utils/tourAllocations.ts`
  - `calculateAllocation()` - Handles even/custom/weighted/none modes
  - `generateAllocationPreview()` - UI preview generation
  - `buildTourFinancials()` - Complete tour P&L calculation
  - `validateCustomAllocations()` - Validation helper
  - `getAllocationModeLabel()` - Display labels

### ✅ React Hooks
- **File:** `/src/hooks/useTours.ts`
  - useTours, useTour, useCreateTour, useUpdateTour, useDeleteTour
  - useAddGigsToTour, useRemoveGigFromTour

- **File:** `/src/hooks/useSettlements.ts`
  - useSettlements, useCreateSettlement, useUpdateSettlement, useDeleteSettlement

- **File:** `/src/lib/queryKeys.ts` (updated)
  - Added tours and settlements query keys

### ✅ UI Screens
- **File:** `/src/screens/ToursScreen.tsx`
  - Tours list view
  - Create tour CTA
  - Empty state handling
  - Tour card display

- **File:** `/src/screens/TourDetailScreen.tsx`
  - Tour header with metadata
  - P&L summary card
  - Gigs list with per-gig net
  - Settlements section
  - Tour expenses section
  - Integration with allocation calculations

### ✅ UI Components
- **File:** `/src/components/tours/CreateTourModal.tsx`
  - Modal for creating new tours
  - Form validation
  - Error handling

- **File:** `/src/components/tours/AddGigsToTourModal.tsx`
  - Multi-select gig picker
  - Search/filter functionality
  - Shows only ungrouped gigs
  - Selection count display

## Remaining Work

### 🔨 To Complete

1. **AddSettlementModal Component**
   - Create `/src/components/tours/AddSettlementModal.tsx`
   - Settlement form with amount, payer, date
   - Allocation mode selector
   - Preview of per-gig distribution
   - Validation for custom allocations

2. **Tour Assignment on Gig Pages**
   - Add tour dropdown to gig edit form
   - Show current tour assignment
   - Allow assign/unassign
   - Update `/src/components/AddGigModal.tsx`

3. **Tour Expense Management**
   - Create tour expense add/edit UI
   - Allocation mode selection
   - Preview distribution across gigs

4. **Navigation Integration**
   - Add "Tours" to main navigation menu
   - Add routing for `/tours` and `/tours/:id`
   - Update navigation types

5. **Database Types Update**
   - Run migration on Supabase
   - Regenerate `database.types.ts` with new tables
   - Fix TypeScript errors in hooks (settlements, tour_runs not in types yet)

6. **UI Component Dependencies**
   - Create or import `Input` component (referenced but not found)
   - Verify all UI components are exported from `/src/ui`

7. **Testing**
   - Test tour creation flow
   - Test gig assignment/unassignment
   - Test allocation calculations
   - Verify RLS policies
   - Test edge cases (0 gigs, weighted with no guarantees, etc.)

## Known Issues to Fix

### TypeScript Errors
1. **settlements table not in database types** - Will be resolved after migration + type regeneration
2. **tour_runs table not in database types** - Will be resolved after migration + type regeneration
3. **Input component not found** - Need to create or verify export from UI library
4. **tour_id property on GigWithPayer** - Need to add to type definition after migration

### Styling Issues (Already Fixed)
- ✅ Fixed spacing references to use `spacingNum`
- ✅ Fixed color references to use correct theme properties
- ✅ Fixed EmptyState action prop format

## Migration Steps

### 1. Apply Database Migration
```bash
# In Supabase SQL Editor, run:
/supabase/migrations/20260212_create_tours_and_settlements.sql
```

### 2. Regenerate Types
```bash
supabase gen types typescript --project-ref YOUR_PROJECT_REF > src/types/database.types.ts
```

### 3. Update Gig Types
Add `tour_id` to GigWithPayer interface:
```typescript
export interface GigWithPayer extends Gig {
  tour_id?: string | null;
  // ... existing fields
}
```

### 4. Create Missing Components
- AddSettlementModal
- Tour expense modals
- Input component (if not exists)

### 5. Update Navigation
Add Tours screen to navigation configuration

## How to Use (Once Complete)

### Creating a Tour
1. Go to Tours screen
2. Click "Create Tour"
3. Enter name, optional artist name and notes
4. Click "Create Tour"

### Adding Gigs to Tour
1. Open tour detail
2. Click "Add Gigs"
3. Search/select gigs
4. Click "Add X Gigs"

### Adding Settlements
1. Open tour detail
2. Click "Add Settlement"
3. Enter amount, payer, date
4. Choose allocation mode
5. Preview distribution
6. Save

### Viewing Tour P&L
- Tour detail page shows complete financial summary
- Gross income from settlements
- Total expenses (tour + gig-specific)
- Net profit/loss
- Per-gig breakdown

## Files Created

```
/supabase/migrations/20260212_create_tours_and_settlements.sql
/src/types/tours.types.ts
/src/utils/tourAllocations.ts
/src/hooks/useTours.ts
/src/hooks/useSettlements.ts
/src/screens/ToursScreen.tsx
/src/screens/TourDetailScreen.tsx
/src/components/tours/CreateTourModal.tsx
/src/components/tours/AddGigsToTourModal.tsx
/TOUR_FEATURE_GUIDE.md
/TOUR_IMPLEMENTATION_SUMMARY.md
```

## Files Modified

```
/src/lib/queryKeys.ts (added tours and settlements keys)
```

## Next Actions

1. **Run the migration** in Supabase to create tables
2. **Regenerate database types** to fix TypeScript errors
3. **Create AddSettlementModal** component
4. **Add navigation** for Tours screen
5. **Test the feature** end-to-end
6. **Add tour dropdown** to gig edit form
7. **Create tour expense UI**

## Allocation Logic Example

### Even Split
```typescript
Settlement: $1,000 across 4 gigs
Result: $250 per gig
```

### Weighted by Guarantee
```typescript
Gig 1: $500 guarantee → 50% → $500
Gig 2: $300 guarantee → 30% → $300
Gig 3: $200 guarantee → 20% → $200
Total: $1,000
```

### Custom
```typescript
User specifies:
Gig 1: $400
Gig 2: $350
Gig 3: $150
Gig 4: $100
Total: $1,000 (validated)
```

## Architecture Decisions

1. **Client-side allocation calculations** - Provides flexibility and real-time previews
2. **Store allocation_json** - Ensures stable exports and invoices
3. **Soft delete via SET NULL** - Deleting tour ungroups gigs, doesn't delete them
4. **RLS on all tables** - User data isolation
5. **Triggers for date ranges** - Auto-compute but allow manual override
6. **View for summaries** - Performance optimization for tour lists

---

**Status:** Core implementation complete, UI integration in progress  
**Estimated Completion:** 2-4 hours remaining for full feature  
**Priority Next Steps:** Run migration, create AddSettlementModal, add navigation
