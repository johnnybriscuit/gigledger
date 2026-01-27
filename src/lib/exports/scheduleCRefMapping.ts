import type { DbExpenseCategory } from '../categoryMapping';
import type { ScheduleCRefNumber } from './taxExportPackage';

export type ScheduleCRefMappingResult = {
  refNumber: ScheduleCRefNumber;
  deductiblePercent: number;
  otherDescription?: string;
};

export function mapCategoryToScheduleCRef(
  category: string,
  mealsPercentAllowed?: number | null
): ScheduleCRefMappingResult {
  const normalized = category as DbExpenseCategory;

  if (normalized === 'Meals & Entertainment') {
    const pct = typeof mealsPercentAllowed === 'number' ? mealsPercentAllowed : 0.5;
    return { refNumber: 294, deductiblePercent: pct };
  }

  if (normalized === 'Travel' || normalized === 'Lodging') {
    return { refNumber: 317, deductiblePercent: 1 };
  }

  if (normalized === 'Marketing/Promotion') {
    return { refNumber: 304, deductiblePercent: 1 };
  }

  if (normalized === 'Professional Fees') {
    return { refNumber: 298, deductiblePercent: 1 };
  }

  if (normalized === 'Software/Subscriptions') {
    return { refNumber: 313, deductiblePercent: 1 };
  }

  if (normalized === 'Supplies') {
    return { refNumber: 301, deductiblePercent: 1 };
  }

  if (normalized === 'Rent/Studio') {
    return { refNumber: 300, deductiblePercent: 1 };
  }

  if (normalized === 'Equipment/Gear') {
    return { refNumber: 302, deductiblePercent: 1, otherDescription: 'GigLedger: Equipment/Gear' };
  }

  if (normalized === 'Education/Training') {
    return { refNumber: 302, deductiblePercent: 1, otherDescription: 'GigLedger: Education/Training' };
  }

  return { refNumber: 302, deductiblePercent: 1, otherDescription: `GigLedger: ${category || 'Other'}` };
}

export function isIncomeRefNumber(ref: ScheduleCRefNumber): boolean {
  return ref === 293 || ref === 303;
}

export function isReturnsAllowancesRefNumber(ref: ScheduleCRefNumber): boolean {
  return ref === 296;
}

export function isCogsRefNumber(ref: ScheduleCRefNumber): boolean {
  return ref === 295;
}
