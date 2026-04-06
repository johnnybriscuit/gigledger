import { describe, expect, it } from 'vitest';
import {
  calculateMileageDeduction,
  getMileageRateForDate,
  getStandardMileageRate,
  parseMileageInput,
  sumMileageDeduction,
} from '../mileage';

describe('mileage helpers', () => {
  it('uses historical IRS rates by entry date', () => {
    expect(getMileageRateForDate('2024-06-01')).toBe(0.67);
    expect(getMileageRateForDate('2025-06-01')).toBe(0.7);
  });

  it('falls back to the latest configured rate for unsupported years', () => {
    expect(getStandardMileageRate(2026)).toBe(0.7);
    expect(getMileageRateForDate('2026-01-15')).toBe(0.7);
  });

  it('calculates mixed-year mileage deductions accurately', () => {
    expect(sumMileageDeduction([
      { miles: 10, date: '2024-01-10' },
      { miles: 10, date: '2025-01-10' },
    ])).toBe(13.7);
    expect(calculateMileageDeduction(15, '2024-02-01')).toBe(10.05);
  });

  it('rejects malformed or unreasonable mileage input', () => {
    expect(parseMileageInput('12abc')).toBeNull();
    expect(parseMileageInput('0')).toBeNull();
    expect(parseMileageInput('10000.01')).toBeNull();
    expect(parseMileageInput('15.5')).toBe(15.5);
  });
});
