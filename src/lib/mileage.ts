import { parseStoredDate } from './date';

export const STANDARD_MILEAGE_RATES = {
  2023: 0.655,
  2024: 0.67,
  2025: 0.70,
} as const;

export const MAX_REASONABLE_MILES_PER_TRIP = 10000;

const MILEAGE_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/;

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getLatestSupportedMileageYear(): number {
  return Math.max(...Object.keys(STANDARD_MILEAGE_RATES).map(Number));
}

export function getStandardMileageRate(taxYear?: number): number {
  const year = taxYear ?? getLatestSupportedMileageYear();
  const ratesByYear = STANDARD_MILEAGE_RATES as Record<number, number>;
  return ratesByYear[year] ?? ratesByYear[getLatestSupportedMileageYear()];
}

export function getMileageRateForDate(date?: string | Date | null): number {
  return getStandardMileageRate(getMileageRateYearForDate(date));
}

export function getMileageRateYearForDate(date?: string | Date | null): number {
  if (!date) return getLatestSupportedMileageYear();

  const parsed = typeof date === 'string' ? parseStoredDate(date) : date;
  if (!Number.isFinite(parsed.getTime())) {
    return getLatestSupportedMileageYear();
  }

  const year = parsed.getFullYear();
  const supportedYears = new Set(Object.keys(STANDARD_MILEAGE_RATES).map(Number));
  return supportedYears.has(year) ? year : getLatestSupportedMileageYear();
}

export function calculateMileageDeduction(miles: number, date?: string | Date | null): number {
  if (!Number.isFinite(miles) || miles <= 0) {
    return 0;
  }

  return roundCents(miles * getMileageRateForDate(date));
}

export function sumMileageDeduction<T extends { miles: number; date?: string | null }>(entries: T[]): number {
  return roundCents(
    entries.reduce((sum, entry) => sum + calculateMileageDeduction(entry.miles, entry.date), 0)
  );
}

export function parseMileageInput(value: string): number | null {
  const normalized = value.trim();
  if (!MILEAGE_INPUT_PATTERN.test(normalized)) {
    return null;
  }

  const miles = Number(normalized);
  if (!Number.isFinite(miles) || miles <= 0 || miles > MAX_REASONABLE_MILES_PER_TRIP) {
    return null;
  }

  return miles;
}
