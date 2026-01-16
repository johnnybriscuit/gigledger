# Meals Expense Constraint Fix - Implementation Summary

## Problem
The app was throwing a database constraint error `expenses_meals_percent_allowed_check` when creating Meals & Entertainment expenses. The constraint expects values between 0 and 1 (e.g., 0.5 = 50%, 1.0 = 100%), but the code was sending invalid values.

## Root Cause
- DB constraint: `meals_percent_allowed` must be between 0 and 1 or NULL
- Previous code was hardcoding `50` instead of `0.5`, violating the constraint
- No UI existed for users to select 50% vs 100% deductibility

## Solution Implemented

### 1. Added UI for Meals Deductible Percentage
**File: `src/components/AddExpenseModal.tsx`**

- Added state variable `mealsDeductiblePercent` with type `50 | 100` (default: 50)
- Added conditional UI section that appears only when category = "Meals & Entertainment"
- Implemented toggle buttons for 50% and 100% selection
- Added helper text explaining when to use 100% (office snacks, team meals, etc.)
- Added styles for the toggle UI (mealsDeductibleContainer, mealsToggleButton, etc.)

### 2. Fixed Value Normalization
**File: `src/components/AddExpenseModal.tsx`**

- Changed payload building to normalize UI values (50/100) to DB format (0.5/1.0):
  ```typescript
  meals_percent_allowed: category === 'Meals & Entertainment' 
    ? mealsDeductiblePercent / 100 
    : undefined
  ```
- For non-Meals expenses, the field is set to `undefined` (which becomes NULL in DB)
- Added proper handling when editing existing expenses to convert DB values back to UI values

### 3. Updated Validation Schema
**File: `src/lib/validations.ts`**

- Changed `meals_percent_allowed` validation from `z.number().min(0).max(100)` to `z.number().min(0).max(1)`
- This ensures Zod validation matches DB constraint expectations

### 4. Enhanced Error Handling
**File: `src/components/AddExpenseModal.tsx`**

- Added user-friendly error message for constraint violations
- Instead of showing raw DB error, displays: "Meals expenses must be marked 50% or 100% deductible."
- Error detection checks for both 'meals_percent' and 'constraint' in error messages

### 5. Fixed Recurring Expenses
**File: `src/hooks/useRecurringExpenses.ts`**

- Updated `useQuickAddExpense` to set `meals_percent_allowed: 0.5` for Meals & Entertainment
- Prevents constraint error when creating expenses from recurring templates

### 6. Database Migration
**File: `supabase/migrations/20260116_fix_meals_percent_constraint.sql`**

- Ensures constraint is properly named `expenses_meals_percent_allowed_check`
- Fixes any existing data with invalid values (converts 50 → 0.5, 100 → 1.0)
- Backfills NULL values to 0.5 for existing Meals & Entertainment expenses
- Adds constraint comment for documentation

## Changes Summary

### Modified Files
1. `src/components/AddExpenseModal.tsx` - Added UI, normalization, error handling
2. `src/lib/validations.ts` - Updated validation range
3. `src/hooks/useRecurringExpenses.ts` - Fixed quick-add for meals expenses

### New Files
1. `supabase/migrations/20260116_fix_meals_percent_constraint.sql` - DB constraint fix

## QA Checklist

✅ Create Meals expense with default 50% → saves correctly
✅ Change to 100% → saves correctly  
✅ Create non-meals expense → saves (meals_percent_allowed = NULL)
✅ Edit existing Meals expense → loads correct percentage
✅ Create meals expense with receipt upload → saves, receipt attaches
✅ User-friendly error message on constraint violation
✅ Recurring expense quick-add for Meals → saves correctly
✅ Works on both desktop web and mobile web (React Native Web)

## Behavior Details

### When Category = "Meals & Entertainment"
- UI shows "Meals Deductible %" section with toggle buttons
- Default selection: 50%
- User can toggle between 50% and 100%
- Value normalized to 0.5 or 1.0 before DB insert
- Helper text guides users on when to use 100%

### When Category ≠ "Meals & Entertainment"  
- UI section hidden
- `meals_percent_allowed` set to `undefined` (NULL in DB)
- No constraint violation

### Error Handling
- Zod validation catches invalid ranges before DB
- DB constraint provides final safety net
- User sees friendly message, not raw SQL error
- Console logs full error for debugging

## Database Schema
```sql
ALTER TABLE expenses
ADD CONSTRAINT expenses_meals_percent_allowed_check 
CHECK (meals_percent_allowed IS NULL OR (meals_percent_allowed >= 0 AND meals_percent_allowed <= 1));
```

## Next Steps
1. Run migration: `supabase/migrations/20260116_fix_meals_percent_constraint.sql`
2. Deploy to production
3. Monitor for any constraint errors (should be eliminated)
4. Consider adding similar UI for other category-specific fields if needed

## Notes
- Design follows existing BusinessUseSlider pattern for consistency
- Mobile-friendly with proper touch targets
- Maintains existing design system (colors, spacing, typography)
- No changes to routing, AppShell, or navigation (per requirements)
