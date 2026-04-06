import { parseStoredDate, toUtcDateString } from './date';

/**
 * Shared date range utilities used across screens.
 * Extracted from useDashboardData so Gigs/Expenses/Mileage/Exports
 * can do client-side filtering without duplicating logic.
 */

export type DateRange = 'ytd' | 'thisYear' | 'last30' | 'last90' | 'lastYear' | 'custom';

export interface DateRangeConfig {
  startDate: Date;
  endDate: Date;
}

export function getDateRangeConfig(
  range: DateRange,
  customStart?: Date,
  customEnd?: Date
): DateRangeConfig {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date(now);

  switch (range) {
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'last30':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      break;
    case 'last90':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      break;
    case 'thisYear':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate.setFullYear(now.getFullYear(), 11, 31);
      break;
    case 'lastYear':
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate.setFullYear(now.getFullYear() - 1, 11, 31);
      break;
    case 'custom':
      if (customStart && customEnd) {
        startDate = customStart;
        endDate.setTime(customEnd.getTime());
      }
      break;
  }

  return { startDate, endDate };
}

export function filterByDateRange<T extends { date?: string | null }>(
  items: T[] | undefined,
  startDate: Date,
  endDate: Date
): T[] {
  if (!items) return [];
  return items.filter((item) => {
    const dateStr = item.date;
    if (!dateStr) return false;
    const itemDate = parseStoredDate(dateStr);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

/** Convert a DateRange enum to ISO date strings for API/export use */
export function dateRangeToStrings(
  range: DateRange,
  customStart?: Date,
  customEnd?: Date
): { startDate: string; endDate: string } {
  const { startDate, endDate } = getDateRangeConfig(range, customStart, customEnd);
  return {
    startDate: toUtcDateString(startDate),
    endDate: toUtcDateString(endDate),
  };
}
