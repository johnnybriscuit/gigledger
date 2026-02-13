# Tour/Run Feature - UX Refactor

## Summary of Changes

The Tour/Run feature has been refactored to integrate into the Gigs workflow rather than existing as a separate top-level navigation item.

## Navigation Changes

### Removed
- **Tours tab** (🎸 icon) from left sidebar navigation
- Tours is no longer a primary navigation destination

### Kept (for deep-linking)
- `/tours` routes still exist and are accessible via direct URL
- Tour detail pages remain functional at `/tours/[id]`
- This allows "View Tour Summary" links to work from within Gigs

## New UX Flow

### Primary Access: Gigs Page

Tours are now managed entirely from the **Gigs** page:

#### 1. Tour Filter (Top of Gigs List)
- **Filter dropdown** with options:
  - "All gigs" - shows all gigs
  - "No tour" - shows only gigs not assigned to a tour
  - Individual tours - shows gigs for that specific tour
- **"View Tour Summary"** button appears when a specific tour is filtered
  - Links to the tour detail page (`/tours/[id]`)

#### 2. Tour Management Actions
- **"Create Tour"** button - Opens modal to create a new tour
- **"Assign to Tour"** button - Enters selection mode:
  - Checkboxes appear on gig cards
  - Select multiple gigs
  - Click "Add to Tour" to assign selected gigs to a tour
  - Click "Remove from Tour" to unassign gigs (if they're on a tour)
  - Click "Cancel" to exit selection mode

#### 3. Tour Badge on Gig Cards
- Each gig assigned to a tour shows a **tour badge** (🎸 Tour Name)
- Clicking the badge navigates to the tour detail page

### Secondary Access: Gig Detail Page

On individual gig detail views:
- Shows current tour name (if assigned)
- Provides "Change Tour" or "Remove from Tour" options
- Link to "View Tour Summary" for the assigned tour

## Components Created/Modified

### New Components
1. **`AssignGigsToTourModal.tsx`** - Modal for selecting a tour to assign pre-selected gigs to
2. **`GigsScreenWithTours.tsx`** - Enhanced Gigs screen with tour integration (reference implementation)

### Modified Components
1. **`AppShell.tsx`** - Removed 'tours' from Route type and NAV_ITEMS
2. **`DashboardScreen.tsx`** - Removed 'tours' from Tab type and removed ToursScreen case

### Reused Components (No Changes)
- `CreateTourModal` - Still used, now triggered from Gigs page
- `AddGigsToTourModal` - Still used for adding gigs to existing tours
- `TourDetailScreen` - Still accessible via deep-link
- `AddSettlementModal` - Still used from tour detail page
- All tour hooks (`useTours`, `useSettlements`, etc.) - No changes

## Database Schema

**No changes** - All existing database tables, RLS policies, triggers, and views remain unchanged:
- `tour_runs` table
- `settlements` table
- `gigs.tour_id` foreign key
- `expenses.tour_id` foreign key
- All RLS policies
- All triggers and views

## Implementation Status

### ✅ Completed
- Removed Tours from sidebar navigation
- Created AssignGigsToTourModal component
- Documented UX changes

### 🚧 In Progress
- Integrating tour features into existing GigsScreen
- Adding tour filter UI
- Adding selection mode for bulk assignment

### ⏳ Pending
- Update GigDetailScreen to show tour info
- Test all tour workflows from Gigs page
- Rebuild and redeploy web app

## Routes Still Available

These routes remain accessible for deep-linking and internal navigation:

- `/tours` - Tours list (hidden from nav, but functional)
- `/tours/[id]` - Tour detail with P&L summary
- All tour-related API endpoints

## User Workflow Examples

### Creating a Tour and Adding Gigs
1. Go to **Gigs** page
2. Click **"Create Tour"** button
3. Fill in tour name, artist, notes
4. Click **"Assign to Tour"** button
5. Select gigs to add
6. Click **"Add to Tour"**
7. Choose the newly created tour
8. Gigs now show tour badge

### Viewing Tour Summary
1. Go to **Gigs** page
2. Use filter dropdown to select a tour
3. Click **"View Tour Summary"**
4. See tour P&L, settlements, and financial breakdown

### Removing Gigs from Tour
1. Go to **Gigs** page
2. Filter by the tour (optional)
3. Click **"Assign to Tour"** to enter selection mode
4. Select gigs to remove
5. Click **"Remove from Tour"**
6. Confirm removal

## Benefits of This Approach

1. **Reduced navigation complexity** - One less top-level nav item
2. **Contextual workflow** - Manage tours where you manage gigs
3. **Maintains all functionality** - No features removed, just reorganized
4. **Backwards compatible** - Deep links and direct URLs still work
5. **Minimal code changes** - Reuses existing components and logic
