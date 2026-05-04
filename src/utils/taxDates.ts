/**
 * Tax Date Utilities
 * Calculates IRS quarterly estimated tax payment due dates
 */

/**
 * Get the next IRS quarterly estimated tax payment due date
 * 
 * IRS quarterly due dates:
 * - Q1 (Jan-Mar income) → due April 15
 * - Q2 (Apr-May income) → due June 16
 * - Q3 (Jun-Aug income) → due September 15
 * - Q4 (Sep-Dec income) → due January 15 (following year)
 * 
 * @param fromDate - The date to calculate from (defaults to today)
 * @returns The next quarterly due date
 */
export function getNextQuarterlyDueDate(fromDate: Date = new Date()): Date {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth(); // 0-indexed
  const day = fromDate.getDate();

  // Define quarterly due dates for the current year
  const q1Due = new Date(year, 3, 15); // April 15
  const q2Due = new Date(year, 5, 16); // June 16
  const q3Due = new Date(year, 8, 15); // September 15
  const q4Due = new Date(year + 1, 0, 15); // January 15 (next year)

  // Find the next due date
  if (fromDate < q1Due) {
    return q1Due;
  } else if (fromDate < q2Due) {
    return q2Due;
  } else if (fromDate < q3Due) {
    return q3Due;
  } else {
    return q4Due;
  }
}

/**
 * Format a date for display in tax tooltips
 * @param date - The date to format
 * @returns Formatted date string (e.g., "April 15, 2026")
 */
export function formatTaxDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
