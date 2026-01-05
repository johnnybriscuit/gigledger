# Deduction Help Feature Implementation

## Overview
Added educational deduction help to GigLedger to guide users about expense deductibility without cluttering the UI.

## Changes Made

### 1. Database Migrations
Created two migration files in `/supabase/migrations/`:

- **20250105_add_deduction_fields.sql**: Adds `business_use_percent` field to expenses table
- **20250105_update_expense_categories.sql**: Updates expense categories to be more descriptive and tax-friendly

#### New Expense Categories
- Meals & Entertainment (replaces "Meals")
- Travel
- Lodging
- Equipment/Gear (replaces "Equipment")
- Supplies
- Software/Subscriptions (replaces "Software")
- Marketing/Promotion (replaces "Marketing")
- Professional Fees (replaces "Fees")
- Education/Training (replaces "Education")
- Rent/Studio (replaces "Rent")
- Other

### 2. New Components

#### DeductibilityHint Component (`src/components/DeductibilityHint.tsx`)
- Displays category-specific deduction hints in the expense modal
- Shows 1-2 sentence hint with expandable "Learn more" section
- Positioned below category dropdown, before description field
- Subtle styling with light blue background and info icon

**Category-Specific Hints:**
- **Meals & Entertainment**: 50% deductible, prompts for attendees and business purpose
- **Travel**: Fully deductible if overnight for business
- **Lodging**: Deductible for overnight business trips
- **Equipment/Gear**: Large purchases may need depreciation (>$2,500)
- **Supplies**: Fully deductible if used for business
- **Software/Subscriptions**: Deductible based on business use percentage
- **Marketing/Promotion**: Advertising costs are deductible
- **Professional Fees**: Agent fees, booking fees, union dues
- **Education/Training**: Must improve current skills
- **Rent/Studio**: Deductible based on business use
- **Other**: Keep detailed notes

#### DeductionInfoCard Component (`src/components/DeductionInfoCard.tsx`)
- Collapsible educational card on Expenses page
- Collapsed by default with "📘 How Deductions Work (1-min read)" header
- Expands to show plain-English explanation of tax deductions
- Includes examples, special rules, and disclaimer

### 3. Updated Components

#### AddExpenseModal (`src/components/AddExpenseModal.tsx`)
**Changes:**
- Updated expense categories to new descriptive names
- Added DeductibilityHint component below category selection
- Added Business Use % field for relevant categories:
  - Software/Subscriptions
  - Equipment/Gear
  - Rent/Studio
- Automatically sets `meals_percent_allowed` to 50 for Meals & Entertainment
- Stores `business_use_percent` for applicable categories

#### ExpensesScreen (`src/screens/ExpensesScreen.tsx`)
**Changes:**
- Added DeductionInfoCard to the top of the expenses list
- Positioned above usage indicator and expense items

### 4. Type Updates

#### Validation Schema (`src/lib/validations.ts`)
- Updated `expenseSchema` with new category enum values
- Added `business_use_percent` field (0-100, optional)
- Added `meals_percent_allowed` field (0-100, optional)

#### Database Types (`src/types/database.types.ts`)
- Updated `expense_category` enum with new values
- Added `business_use_percent` field to expenses Row, Insert, and Update types
- Updated Constants array to match new categories

## Database Schema Changes

### New Fields
```sql
-- expenses table
business_use_percent INTEGER DEFAULT 100 CHECK (business_use_percent >= 0 AND business_use_percent <= 100)
```

### Updated Enum
```sql
CREATE TYPE expense_category AS ENUM (
  'Meals & Entertainment',
  'Travel',
  'Lodging',
  'Equipment/Gear',
  'Supplies',
  'Software/Subscriptions',
  'Marketing/Promotion',
  'Professional Fees',
  'Education/Training',
  'Rent/Studio',
  'Other'
);
```

## Migration Instructions

### To Apply Database Changes:
1. Run the migrations in order:
   ```bash
   # Connect to your Supabase project
   supabase db push
   ```

2. Or manually run the SQL files in the Supabase SQL Editor:
   - First: `20250105_update_expense_categories.sql`
   - Second: `20250105_add_deduction_fields.sql`

3. Regenerate TypeScript types (if needed):
   ```bash
   npm run supabase:types
   ```

## Features Implemented

### ✅ Expense Create/Edit Modal (Priority 1)
- [x] Category-specific deductibility hints
- [x] Expandable "Learn more" sections
- [x] Business Use % field for relevant categories
- [x] 50% meal deduction flag (automatic)
- [x] Positioned below category, before description
- [x] Subtle styling with light background

### ✅ Expenses Page (Priority 2)
- [x] Collapsible info card
- [x] Collapsed by default
- [x] Plain-English educational content
- [x] Examples for musicians/freelancers
- [x] Special rules section
- [x] Tax professional disclaimer

## Testing Checklist

- [ ] Hint changes correctly when switching expense categories
- [ ] "Learn more" expands/collapses smoothly in modal
- [ ] Business Use % field only appears for relevant categories
- [ ] 50% meal deduction flag is applied correctly
- [ ] Info card on Expenses page expands/collapses properly
- [ ] Mobile layout looks clean and readable
- [ ] No performance issues when opening/closing modals
- [ ] Styling matches existing design system
- [ ] Existing expenses still display correctly
- [ ] Category migration preserves data integrity

## Notes

- The `meals_percent_allowed` field already existed in the database
- The 50% deduction for meals is set automatically in the application logic
- Business use percentage defaults to 100% if not specified
- All styling follows existing design system (colors, spacing, typography)
- No CSS @media queries used (per technical constraints)
- No changes to AppShell navigation or layout
