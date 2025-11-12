/**
 * Pre-Export Validator
 * Checks for blocking errors and warnings before generating tax exports
 */

import type { GigExportRow, ExpenseExportRow, MileageExportRow } from './schemas';

export type ValidationIssue = {
  type: 'error' | 'warning';
  category: 'expense' | 'gig' | 'mileage';
  id: string; // Record ID
  field: string;
  message: string;
};

export type ValidationResult = {
  isValid: boolean; // False if any blocking errors
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    totalIssues: number;
    blockingErrors: number;
    warnings: number;
  };
};

/**
 * Validate all export data before generating CSVs
 */
export function validateExportData(
  gigs: GigExportRow[],
  expenses: ExpenseExportRow[],
  mileage: MileageExportRow[]
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Validate expenses
  for (const expense of expenses) {
    // BLOCKING: Missing IRS Schedule C line code
    if (!expense.irs_schedule_c_line || expense.irs_schedule_c_line.trim() === '') {
      errors.push({
        type: 'error',
        category: 'expense',
        id: expense.expense_id,
        field: 'irs_schedule_c_line',
        message: `Expense "${expense.description}" is missing IRS Schedule C line code. This is required for tax filing.`,
      });
    }

    // BLOCKING: Negative amount
    if (expense.amount < 0) {
      errors.push({
        type: 'error',
        category: 'expense',
        id: expense.expense_id,
        field: 'amount',
        message: `Expense "${expense.description}" has negative amount: $${expense.amount}. Amounts must be positive.`,
      });
    }

    // BLOCKING: Invalid date
    if (!isValidDate(expense.date)) {
      errors.push({
        type: 'error',
        category: 'expense',
        id: expense.expense_id,
        field: 'date',
        message: `Expense "${expense.description}" has invalid date: ${expense.date}`,
      });
    }

    // WARNING: Meals without percentage
    if (isMealsExpense(expense) && !expense.meals_percent_allowed) {
      warnings.push({
        type: 'warning',
        category: 'expense',
        id: expense.expense_id,
        field: 'meals_percent_allowed',
        message: `Meals expense "${expense.description}" missing deduction percentage. Will default to 50%.`,
      });
    }
  }

  // Validate gigs
  for (const gig of gigs) {
    // BLOCKING: Negative amounts
    if (gig.gross_amount < 0) {
      errors.push({
        type: 'error',
        category: 'gig',
        id: gig.gig_id,
        field: 'gross_amount',
        message: `Gig "${gig.title}" has negative gross amount: $${gig.gross_amount}`,
      });
    }

    // BLOCKING: Invalid date
    if (!isValidDate(gig.date)) {
      errors.push({
        type: 'error',
        category: 'gig',
        id: gig.gig_id,
        field: 'date',
        message: `Gig "${gig.title}" has invalid date: ${gig.date}`,
      });
    }

    // WARNING: Missing payer name
    if (!gig.payer_name || gig.payer_name.trim() === '') {
      warnings.push({
        type: 'warning',
        category: 'gig',
        id: gig.gig_id,
        field: 'payer_name',
        message: `Gig "${gig.title}" is missing payer name. This may be needed for 1099 reconciliation.`,
      });
    }

    // WARNING: Missing EIN/SSN for paid gigs
    if (gig.paid && (!gig.payer_ein_or_ssn || gig.payer_ein_or_ssn.trim() === '')) {
      warnings.push({
        type: 'warning',
        category: 'gig',
        id: gig.gig_id,
        field: 'payer_ein_or_ssn',
        message: `Paid gig "${gig.title}" is missing payer EIN/SSN. This is needed for 1099 reconciliation.`,
      });
    }
  }

  // Validate mileage
  for (const trip of mileage) {
    // BLOCKING: Negative miles
    if (trip.business_miles < 0) {
      errors.push({
        type: 'error',
        category: 'mileage',
        id: trip.trip_id,
        field: 'business_miles',
        message: `Mileage trip has negative miles: ${trip.business_miles}`,
      });
    }

    // BLOCKING: Invalid date
    if (!isValidDate(trip.date)) {
      errors.push({
        type: 'error',
        category: 'mileage',
        id: trip.trip_id,
        field: 'date',
        message: `Mileage trip has invalid date: ${trip.date}`,
      });
    }

    // WARNING: Missing purpose
    if (!trip.purpose || trip.purpose.trim() === '') {
      warnings.push({
        type: 'warning',
        category: 'mileage',
        id: trip.trip_id,
        field: 'purpose',
        message: `Mileage trip from "${trip.origin}" to "${trip.destination}" is missing business purpose.`,
      });
    }

    // WARNING: Missing origin/destination
    if (!trip.origin || trip.origin.trim() === '') {
      warnings.push({
        type: 'warning',
        category: 'mileage',
        id: trip.trip_id,
        field: 'origin',
        message: `Mileage trip is missing origin location.`,
      });
    }

    if (!trip.destination || trip.destination.trim() === '') {
      warnings.push({
        type: 'warning',
        category: 'mileage',
        id: trip.trip_id,
        field: 'destination',
        message: `Mileage trip is missing destination location.`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalIssues: errors.length + warnings.length,
      blockingErrors: errors.length,
      warnings: warnings.length,
    },
  };
}

/**
 * Check if date string is valid YYYY-MM-DD format
 */
function isValidDate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if expense is meals/entertainment (subject to 50% limitation)
 */
function isMealsExpense(expense: ExpenseExportRow): boolean {
  const mealsLineCode = '24b'; // IRS Schedule C line for meals
  return expense.irs_schedule_c_line === mealsLineCode;
}

/**
 * Get user-friendly summary of validation results
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return '✅ All checks passed! Your data is ready to export.';
  }

  if (!result.isValid) {
    return `❌ ${result.summary.blockingErrors} blocking error(s) found. Please fix these before exporting.`;
  }

  return `⚠️ ${result.summary.warnings} warning(s) found. You can still export, but review these issues.`;
}

/**
 * Group issues by category for display
 */
export function groupIssuesByCategory(issues: ValidationIssue[]): Record<string, ValidationIssue[]> {
  return issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = [];
    }
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, ValidationIssue[]>);
}
