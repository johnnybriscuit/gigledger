/**
 * Date utility functions for GigLedger
 * Handles conversion between local Date objects and UTC yyyy-MM-dd strings
 */

import { format, parseISO } from 'date-fns';

/**
 * Convert a local Date object to a UTC yyyy-MM-dd string for storage
 * @param date - Local Date object
 * @returns UTC date string in yyyy-MM-dd format
 */
export function toUtcDateString(date: Date): string {
  // Create UTC date at midnight
  const utcDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ));
  return utcDate.toISOString().slice(0, 10);
}

/**
 * Convert a UTC yyyy-MM-dd string to a local Date object
 * @param dateString - UTC date string in yyyy-MM-dd format
 * @returns Local Date object
 */
export function fromUtcDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Construct as local date
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object for display
 * @param date - Date object to format
 * @param formatString - Format string (default: 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatDateForDisplay(date: Date, formatString: string = 'MMM d, yyyy'): string {
  return format(date, formatString);
}

/**
 * Get today's date as a local Date object at midnight
 * @returns Date object for today at 00:00:00
 */
export function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is before another date (day-level comparison)
 * @param date - Date to check
 * @param compareDate - Date to compare against
 * @returns True if date is before compareDate
 */
export function isBeforeDay(date: Date, compareDate: Date): boolean {
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(compareDate.getFullYear(), compareDate.getMonth(), compareDate.getDate());
  return d1 < d2;
}

/**
 * Check if a date is after another date (day-level comparison)
 * @param date - Date to check
 * @param compareDate - Date to compare against
 * @returns True if date is after compareDate
 */
export function isAfterDay(date: Date, compareDate: Date): boolean {
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(compareDate.getFullYear(), compareDate.getMonth(), compareDate.getDate());
  return d1 > d2;
}
