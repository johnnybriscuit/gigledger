/**
 * Category Mapping - Single Source of Truth
 * 
 * This file ensures UI labels are correctly mapped to database enum values.
 * NEVER send UI labels directly to the database.
 */

// Database enum values (canonical source of truth)
export const DB_EXPENSE_CATEGORIES = [
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
  'Other',
] as const;

export type DbExpenseCategory = typeof DB_EXPENSE_CATEGORIES[number];

// UI labels (what users see)
export const UI_EXPENSE_CATEGORIES = [
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
  'Other',
] as const;

export type UiExpenseCategory = typeof UI_EXPENSE_CATEGORIES[number];

/**
 * Map UI label to database enum value
 * This is the ONLY function that should be used when saving to the database
 */
export function mapUiToDbCategory(uiCategory: string): DbExpenseCategory {
  // Handle legacy values that might still be in the UI
  const mapping: Record<string, DbExpenseCategory> = {
    'Meals': 'Meals & Entertainment',
    'Meals & Entertainment': 'Meals & Entertainment',
    'Equipment': 'Equipment/Gear',
    'Equipment/Gear': 'Equipment/Gear',
    'Software': 'Software/Subscriptions',
    'Software/Subscriptions': 'Software/Subscriptions',
    'Marketing': 'Marketing/Promotion',
    'Marketing/Promotion': 'Marketing/Promotion',
    'Fees': 'Professional Fees',
    'Professional Fees': 'Professional Fees',
    'Education': 'Education/Training',
    'Education/Training': 'Education/Training',
    'Rent': 'Rent/Studio',
    'Rent/Studio': 'Rent/Studio',
    'Travel': 'Travel',
    'Lodging': 'Lodging',
    'Supplies': 'Supplies',
    'Other': 'Other',
  };

  const dbCategory = mapping[uiCategory];
  
  if (!dbCategory) {
    console.warn(`Unknown category "${uiCategory}", defaulting to "Other"`);
    return 'Other';
  }

  return dbCategory;
}

/**
 * Map database enum value to UI label
 * Use this when displaying categories to users
 */
export function mapDbToUiCategory(dbCategory: string): UiExpenseCategory {
  // Database and UI labels are currently the same, but this function
  // provides a layer of abstraction in case they diverge in the future
  if (DB_EXPENSE_CATEGORIES.includes(dbCategory as DbExpenseCategory)) {
    return dbCategory as UiExpenseCategory;
  }

  console.warn(`Unknown database category "${dbCategory}", defaulting to "Other"`);
  return 'Other';
}

/**
 * Validate if a string is a valid database category
 */
export function isValidDbCategory(category: string): category is DbExpenseCategory {
  return DB_EXPENSE_CATEGORIES.includes(category as DbExpenseCategory);
}

/**
 * Coerce any category value to a valid database enum
 * Use this as a defensive guard in queries and exports
 */
export function coerceToValidCategory(category: string | null | undefined): DbExpenseCategory {
  if (!category) return 'Other';
  
  const mapped = mapUiToDbCategory(category);
  return mapped;
}
