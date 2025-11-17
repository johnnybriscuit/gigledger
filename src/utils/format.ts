/**
 * Formatting Utilities
 * 
 * Consistent number, currency, and percentage formatting across the app.
 * Ensures visual consistency and reduces cognitive load.
 */

/**
 * Format currency with no decimals (default) or 2 decimals
 * @example formatCurrency(12345) => "$12,345"
 * @example formatCurrency(12345.67, true) => "$12,345.67"
 */
export function formatCurrency(amount: number, showDecimals = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format percentage with 1 decimal place
 * @example formatPercentage(0.141) => "14.1%"
 * @example formatPercentage(14.1) => "14.1%"
 */
export function formatPercentage(value: number, decimals = 1): string {
  // Handle both decimal (0.141) and whole number (14.1) inputs
  const percentage = value < 1 ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format number with commas
 * @example formatNumber(12345) => "12,345"
 * @example formatNumber(12345.67) => "12,345.67"
 */
export function formatNumber(value: number, decimals?: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format compact number (K, M, B)
 * @example formatCompactNumber(1234) => "1.2K"
 * @example formatCompactNumber(1234567) => "1.2M"
 */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format date in a friendly way
 * @example formatDate(new Date('2025-01-15')) => "Jan 15, 2025"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

/**
 * Format date range
 * @example formatDateRange(start, end) => "Jan 1 - Dec 31, 2025"
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  
  if (sameYear) {
    const startStr = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(startDate);
    
    const endStr = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(endDate);
    
    return `${startStr} - ${endStr}`;
  }
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Format miles
 * @example formatMiles(1234.5) => "1,235 mi"
 */
export function formatMiles(miles: number): string {
  return `${formatNumber(Math.round(miles))} mi`;
}

/**
 * Format delta (change) with + or - sign
 * @example formatDelta(123) => "+$123"
 * @example formatDelta(-45) => "-$45"
 */
export function formatDelta(amount: number, showDecimals = false): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${formatCurrency(amount, showDecimals)}`;
}

/**
 * Format percentage delta with + or - sign
 * @example formatPercentageDelta(0.15) => "+15.0%"
 * @example formatPercentageDelta(-0.05) => "-5.0%"
 */
export function formatPercentageDelta(value: number, decimals = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatPercentage(Math.abs(value), decimals)}`;
}
