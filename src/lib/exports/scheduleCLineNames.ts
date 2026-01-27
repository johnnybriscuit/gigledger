import type { ScheduleCRefNumber } from './taxExportPackage';

/**
 * Maps Schedule C reference numbers to human-readable line names
 * for manual entry into tax software.
 */
export const SCHEDULE_C_LINE_NAMES: Record<ScheduleCRefNumber, string> = {
  293: 'Gross receipts or sales',
  296: 'Returns and allowances',
  295: 'Cost of goods sold',
  304: 'Other income',
  305: 'Advertising',
  306: 'Car and truck expenses',
  307: 'Commissions and fees',
  685: 'Contract labor',
  298: 'Depletion',
  299: 'Depreciation',
  300: 'Rent or lease (other business property)',
  301: 'Insurance (other than health)',
  313: 'Office expense',
  308: 'Interest (other)',
  310: 'Legal and professional services',
  311: 'Office expense',
  312: 'Pension and profit-sharing plans',
  314: 'Rent or lease (vehicles)',
  315: 'Rent or lease (other business property)',
  316: 'Repairs and maintenance',
  317: 'Supplies',
  294: 'Meals and entertainment',
  318: 'Travel and meals',
  303: 'Utilities',
  302: 'Other expenses',
  319: 'Wages',
};

/**
 * Get human-readable line name for a Schedule C reference number
 */
export function getScheduleCLineName(refNumber: ScheduleCRefNumber): string {
  return SCHEDULE_C_LINE_NAMES[refNumber] || `Line ${refNumber}`;
}
