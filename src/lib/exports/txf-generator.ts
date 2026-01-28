/**
 * TXF (Tax Exchange Format) Generator
 * For TurboTax Desktop ONLY - TurboTax Online does NOT support generic TXF imports
 * 
 * TXF Format Specification:
 * - Plain text format with caret (^) delimited fields
 * - Each transaction starts with "^" on its own line
 * - Format: V042 (TurboTax 2020+)
 * 
 * IMPORTANT LIMITATIONS:
 * - TurboTax Online does NOT support TXF imports
 * - TurboTax Desktop only (Windows/Mac desktop application)
 * - This is a simplified implementation for Schedule C income/expenses
 * - Does not include all possible tax forms
 * - Users should review all imported data in TurboTax
 */

import type { GigExportRow, ExpenseExportRow, ScheduleCSummaryRow } from './schemas';

// TXF Transaction Codes for Schedule C
// Source: TurboTax TXF specification
const TXF_CODES = {
  // Schedule C Income
  SCHEDULE_C_GROSS_RECEIPTS: 'TD', // Gross receipts or sales
  SCHEDULE_C_OTHER_INCOME: 'TD', // Other income
  
  // Schedule C Expenses
  SCHEDULE_C_ADVERTISING: 'TD', // Advertising
  SCHEDULE_C_CAR_TRUCK: 'TD', // Car and truck expenses
  SCHEDULE_C_COMMISSIONS: 'TD', // Commissions and fees
  SCHEDULE_C_DEPRECIATION: 'TD', // Depreciation
  SCHEDULE_C_INSURANCE: 'TD', // Insurance (other than health)
  SCHEDULE_C_INTEREST_MORTGAGE: 'TD', // Interest - Mortgage
  SCHEDULE_C_INTEREST_OTHER: 'TD', // Interest - Other
  SCHEDULE_C_LEGAL: 'TD', // Legal and professional services
  SCHEDULE_C_OFFICE: 'TD', // Office expense
  SCHEDULE_C_RENT_VEHICLES: 'TD', // Rent or lease - Vehicles
  SCHEDULE_C_RENT_OTHER: 'TD', // Rent or lease - Other
  SCHEDULE_C_REPAIRS: 'TD', // Repairs and maintenance
  SCHEDULE_C_SUPPLIES: 'TD', // Supplies
  SCHEDULE_C_TAXES: 'TD', // Taxes and licenses
  SCHEDULE_C_TRAVEL: 'TD', // Travel
  SCHEDULE_C_MEALS: 'TD', // Meals (50% deductible)
  SCHEDULE_C_UTILITIES: 'TD', // Utilities
  SCHEDULE_C_WAGES: 'TD', // Wages
  SCHEDULE_C_OTHER: 'TD', // Other expenses
} as const;

export interface TXFGeneratorInput {
  taxYear: number;
  taxpayerName: string;
  taxpayerSSN?: string; // Optional, can be omitted for privacy
  gigs: GigExportRow[];
  expenses: ExpenseExportRow[];
  scheduleCSummary: ScheduleCSummaryRow;
}

/**
 * Generate TXF file content for TurboTax Desktop
 */
export function generateTXF(input: TXFGeneratorInput): string {
  const { taxYear, taxpayerName, taxpayerSSN, scheduleCSummary } = input;
  
  const lines: string[] = [];
  
  // ============================================================================
  // HEADER
  // ============================================================================
  lines.push('V042'); // TXF Version (042 = TurboTax 2020+)
  lines.push('ABozzy'); // Application name
  lines.push('^');
  
  // Date of export
  const exportDate = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  lines.push('D' + exportDate);
  lines.push('^');
  
  // ============================================================================
  // TAXPAYER INFORMATION
  // ============================================================================
  lines.push('TS'); // Taxpayer section
  lines.push('^');
  
  // Taxpayer name
  lines.push('N' + taxpayerName);
  lines.push('^');
  
  // SSN (optional - omit if not provided for privacy)
  if (taxpayerSSN) {
    lines.push('S' + taxpayerSSN);
    lines.push('^');
  }
  
  // ============================================================================
  // SCHEDULE C INCOME
  // ============================================================================
  
  // Gross Receipts (Line 1)
  if (scheduleCSummary.gross_receipts > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_GROSS_RECEIPTS);
    lines.push('C1'); // Category 1 (can be used for grouping)
    lines.push('LSchedule C - Gross Receipts');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.gross_receipts));
    lines.push('^');
  }
  
  // Other Income (Line 6)
  if (scheduleCSummary.other_income > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_OTHER_INCOME);
    lines.push('C1');
    lines.push('LSchedule C - Other Income');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.other_income));
    lines.push('^');
  }
  
  // ============================================================================
  // SCHEDULE C EXPENSES
  // ============================================================================
  
  // Advertising (Line 8)
  if (scheduleCSummary.advertising > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_ADVERTISING);
    lines.push('C1');
    lines.push('LSchedule C - Advertising');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.advertising));
    lines.push('^');
  }
  
  // Car and Truck (Line 9)
  if (scheduleCSummary.car_truck > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_CAR_TRUCK);
    lines.push('C1');
    lines.push('LSchedule C - Car and Truck Expenses');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.car_truck));
    lines.push('XStandard mileage rate deduction');
    lines.push('^');
  }
  
  // Commissions and Fees (Line 10)
  if (scheduleCSummary.commissions > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_COMMISSIONS);
    lines.push('C1');
    lines.push('LSchedule C - Commissions and Fees');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.commissions));
    lines.push('^');
  }
  
  // Depreciation (Line 13)
  if (scheduleCSummary.depreciation > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_DEPRECIATION);
    lines.push('C1');
    lines.push('LSchedule C - Depreciation');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.depreciation));
    lines.push('^');
  }
  
  // Insurance (Line 15)
  if (scheduleCSummary.insurance_other > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_INSURANCE);
    lines.push('C1');
    lines.push('LSchedule C - Insurance');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.insurance_other));
    lines.push('^');
  }
  
  // Interest - Mortgage (Line 16a)
  if (scheduleCSummary.interest_mortgage > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_INTEREST_MORTGAGE);
    lines.push('C1');
    lines.push('LSchedule C - Interest (Mortgage)');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.interest_mortgage));
    lines.push('^');
  }
  
  // Interest - Other (Line 16b)
  if (scheduleCSummary.interest_other > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_INTEREST_OTHER);
    lines.push('C1');
    lines.push('LSchedule C - Interest (Other)');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.interest_other));
    lines.push('^');
  }
  
  // Legal and Professional (Line 17)
  if (scheduleCSummary.legal_professional > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_LEGAL);
    lines.push('C1');
    lines.push('LSchedule C - Legal and Professional Services');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.legal_professional));
    lines.push('^');
  }
  
  // Office Expense (Line 18)
  if (scheduleCSummary.office_expense > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_OFFICE);
    lines.push('C1');
    lines.push('LSchedule C - Office Expense');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.office_expense));
    lines.push('^');
  }
  
  // Rent - Vehicles (Line 20a)
  if (scheduleCSummary.rent_vehicles > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_RENT_VEHICLES);
    lines.push('C1');
    lines.push('LSchedule C - Rent or Lease (Vehicles)');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.rent_vehicles));
    lines.push('^');
  }
  
  // Rent - Other (Line 20b)
  if (scheduleCSummary.rent_other > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_RENT_OTHER);
    lines.push('C1');
    lines.push('LSchedule C - Rent or Lease (Other)');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.rent_other));
    lines.push('^');
  }
  
  // Repairs and Maintenance (Line 21)
  if (scheduleCSummary.repairs_maintenance > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_REPAIRS);
    lines.push('C1');
    lines.push('LSchedule C - Repairs and Maintenance');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.repairs_maintenance));
    lines.push('^');
  }
  
  // Supplies (Line 22)
  if (scheduleCSummary.supplies > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_SUPPLIES);
    lines.push('C1');
    lines.push('LSchedule C - Supplies');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.supplies));
    lines.push('^');
  }
  
  // Taxes and Licenses (Line 23)
  if (scheduleCSummary.taxes_licenses > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_TAXES);
    lines.push('C1');
    lines.push('LSchedule C - Taxes and Licenses');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.taxes_licenses));
    lines.push('^');
  }
  
  // Travel (Line 24a)
  if (scheduleCSummary.travel > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_TRAVEL);
    lines.push('C1');
    lines.push('LSchedule C - Travel');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.travel));
    lines.push('^');
  }
  
  // Meals (Line 24b) - Already reduced to 50%
  if (scheduleCSummary.meals_allowed > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_MEALS);
    lines.push('C1');
    lines.push('LSchedule C - Meals (50% deductible)');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.meals_allowed));
    lines.push('X50% limitation already applied');
    lines.push('^');
  }
  
  // Utilities (Line 25)
  if (scheduleCSummary.utilities > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_UTILITIES);
    lines.push('C1');
    lines.push('LSchedule C - Utilities');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.utilities));
    lines.push('^');
  }
  
  // Wages (Line 26)
  if (scheduleCSummary.wages > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_WAGES);
    lines.push('C1');
    lines.push('LSchedule C - Wages');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.wages));
    lines.push('^');
  }
  
  // Other Expenses (Line 27a)
  if (scheduleCSummary.other_expenses_total > 0) {
    lines.push('^');
    lines.push(TXF_CODES.SCHEDULE_C_OTHER);
    lines.push('C1');
    lines.push('LSchedule C - Other Expenses');
    lines.push('D' + exportDate);
    lines.push('$' + formatAmount(scheduleCSummary.other_expenses_total));
    lines.push('^');
  }
  
  return lines.join('\n');
}

/**
 * Format amount for TXF (no commas, 2 decimal places)
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Download TXF file
 */
export function downloadTXF(content: string, taxYear: number): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `bozzy_${taxYear}_schedule_c.txf`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get user-friendly instructions for TXF import
 */
export function getTXFImportInstructions(): string {
  return `
TXF Import Instructions (TurboTax Desktop ONLY):

1. Open TurboTax Desktop (Windows or Mac application)
2. Go to File → Import → From TXF Files
3. Select the downloaded .txf file
4. Review all imported data carefully
5. TurboTax will place amounts on the appropriate Schedule C lines

IMPORTANT NOTES:
• TurboTax Online does NOT support TXF imports
• This feature is for TurboTax Desktop only
• Always review imported data for accuracy
• Keep your CSV exports as backup documentation
• Consult a tax professional if you have questions

LIMITATIONS:
• This is a simplified Schedule C import
• Does not include Form 4562 (depreciation details)
• Does not include vehicle expense details (Part IV)
• Does not include home office deduction (Form 8829)
• Net profit calculation must be verified in TurboTax
  `.trim();
}
