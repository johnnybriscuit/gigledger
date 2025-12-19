/**
 * Tax-Ready Export Generator
 * Generates CPA-friendly CSVs with IRS-compliant headers and Schedule C calculations
 */

import type {
  GigExportRow,
  ExpenseExportRow,
  MileageExportRow,
  PayerExportRow,
  ScheduleCSummaryRow,
} from './schemas';
import {
  GIGS_CSV_HEADERS,
  EXPENSES_CSV_HEADERS,
  MILEAGE_CSV_HEADERS,
  PAYERS_CSV_HEADERS,
  SCHEDULE_C_SUMMARY_CSV_HEADERS,
  IRS_SCHEDULE_C_LINE_CODES,
} from './schemas';

// ============================================================================
// CSV UTILITIES
// ============================================================================

/**
 * Escape CSV field values
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert array of objects to CSV string with exact headers
 */
function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  headers: readonly string[]
): string {
  const rows = [headers.join(',')];

  for (const item of data) {
    const row = headers.map((header) => escapeCSVField(item[header]));
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

// ============================================================================
// CSV GENERATORS
// ============================================================================

export function generateGigsCSV(gigs: GigExportRow[]): string {
  return arrayToCSV(gigs, GIGS_CSV_HEADERS);
}

export function generateExpensesCSV(expenses: ExpenseExportRow[]): string {
  return arrayToCSV(expenses, EXPENSES_CSV_HEADERS);
}

export function generateMileageCSV(mileage: MileageExportRow[]): string {
  return arrayToCSV(mileage, MILEAGE_CSV_HEADERS);
}

export function generatePayersCSV(payers: PayerExportRow[]): string {
  return arrayToCSV(payers, PAYERS_CSV_HEADERS);
}

export function generateScheduleCSummaryCSV(summary: ScheduleCSummaryRow): string {
  // Convert single summary object to array for CSV generation
  return arrayToCSV([summary], SCHEDULE_C_SUMMARY_CSV_HEADERS);
}

// ============================================================================
// SCHEDULE C CALCULATIONS
// ============================================================================

export type ScheduleCCalculationInput = {
  gigs: GigExportRow[];
  expenses: ExpenseExportRow[];
  mileage: MileageExportRow[];
  taxYear: number;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head';
  stateOfResidence: string;
  standardOrItemized: 'standard' | 'itemized';
  includeTips: boolean;
  includeFeesAsDeduction: boolean;
  mileageRate?: number; // IRS standard mileage rate (default 0.67 for 2025)
  taxBreakdown?: {
    selfEmployment: number;
    federalIncome: number;
    stateIncome: number;
    total: number;
  } | null;
};

/**
 * Calculate Schedule C Summary with proper IRS categorization
 */
export function calculateScheduleCSummary(
  input: ScheduleCCalculationInput
): ScheduleCSummaryRow {
  const { gigs, expenses, mileage, taxYear, filingStatus, stateOfResidence, standardOrItemized } = input;
  const mileageRate = input.mileageRate || 0.67; // 2025 IRS rate

  // ============================================================================
  // PART I: INCOME
  // ============================================================================

  let grossReceipts = 0;
  let tipsTotal = 0;
  let perDiemTotal = 0;
  let otherIncomeTotal = 0;
  let feesTotal = 0;

  for (const gig of gigs) {
    grossReceipts += gig.gross_amount;
    
    if (input.includeTips) {
      tipsTotal += gig.tips;
    }
    
    perDiemTotal += gig.per_diem;
    otherIncomeTotal += gig.other_income;
    
    if (!input.includeFeesAsDeduction) {
      feesTotal += gig.fees;
    }
  }

  // Total gross receipts includes all income before fees
  const totalGrossReceipts = grossReceipts + tipsTotal + perDiemTotal + otherIncomeTotal;
  
  // Returns and allowances (fees if treated as reduction of income)
  const returnsAndAllowances = input.includeFeesAsDeduction ? 0 : feesTotal;
  
  // Total income (Line 7 on Schedule C)
  const totalIncome = totalGrossReceipts - returnsAndAllowances;

  // ============================================================================
  // PART II: EXPENSES
  // ============================================================================

  // Initialize all expense categories
  const expenseCategories = {
    advertising: 0,
    car_truck: 0,
    commissions: 0,
    contract_labor: 0,
    depreciation: 0,
    employee_benefit: 0,
    insurance_other: 0,
    interest_mortgage: 0,
    interest_other: 0,
    legal_professional: 0,
    office_expense: 0,
    rent_vehicles: 0,
    rent_other: 0,
    repairs_maintenance: 0,
    supplies: 0,
    taxes_licenses: 0,
    travel: 0,
    meals_allowed: 0, // After 50% reduction
    utilities: 0,
    wages: 0,
    other_expenses_total: 0,
  };

  // Categorize expenses by IRS Schedule C line
  for (const expense of expenses) {
    const lineCode = expense.irs_schedule_c_line;
    let amount = expense.amount;

    // Apply meals limitation (50% deductible)
    if (lineCode === IRS_SCHEDULE_C_LINE_CODES.MEALS) {
      const mealsPercent = expense.meals_percent_allowed || 0.5;
      amount = expense.amount * mealsPercent;
      expenseCategories.meals_allowed += amount;
      continue;
    }

    // Map to expense category
    switch (lineCode) {
      case IRS_SCHEDULE_C_LINE_CODES.ADVERTISING:
        expenseCategories.advertising += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.CAR_TRUCK:
        expenseCategories.car_truck += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.COMMISSIONS:
        expenseCategories.commissions += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.CONTRACT_LABOR:
        expenseCategories.contract_labor += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.DEPRECIATION:
        expenseCategories.depreciation += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.EMPLOYEE_BENEFIT:
        expenseCategories.employee_benefit += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.INSURANCE:
        expenseCategories.insurance_other += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.INTEREST_MORTGAGE:
        expenseCategories.interest_mortgage += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.INTEREST_OTHER:
        expenseCategories.interest_other += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.LEGAL_PROFESSIONAL:
        expenseCategories.legal_professional += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.OFFICE_EXPENSE:
        expenseCategories.office_expense += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.RENT_VEHICLES:
        expenseCategories.rent_vehicles += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.RENT_OTHER:
        expenseCategories.rent_other += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.REPAIRS_MAINTENANCE:
        expenseCategories.repairs_maintenance += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.SUPPLIES:
        expenseCategories.supplies += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.TAXES_LICENSES:
        expenseCategories.taxes_licenses += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.TRAVEL:
        expenseCategories.travel += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.UTILITIES:
        expenseCategories.utilities += amount;
        break;
      case IRS_SCHEDULE_C_LINE_CODES.WAGES:
        expenseCategories.wages += amount;
        break;
      default:
        // Other expenses
        expenseCategories.other_expenses_total += amount;
    }
  }

  // Add mileage deduction to car/truck expenses
  const mileageDeduction = mileage.reduce((sum, trip) => {
    return sum + (trip.business_miles * mileageRate);
  }, 0);
  expenseCategories.car_truck += mileageDeduction;

  // If fees are treated as deduction, add to commissions/fees category
  if (input.includeFeesAsDeduction) {
    expenseCategories.commissions += feesTotal;
  }

  // Total expenses (Line 28 on Schedule C)
  const totalExpenses = Object.values(expenseCategories).reduce((sum, val) => sum + val, 0);

  // ============================================================================
  // NET PROFIT
  // ============================================================================

  const netProfit = totalIncome - totalExpenses;

  // ============================================================================
  // TAX ESTIMATES (Informational only - not part of Schedule C)
  // ============================================================================

  // SE tax basis (92.35% of net profit) - always calculate for informational purposes
  const seTaxBasis = Math.max(0, netProfit * 0.9235);

  // Use tax breakdown from withholding hook if provided (accurate state-specific rates)
  // Otherwise fall back to simplified calculations
  let estSETax: number;
  let estFederalIncomeTax: number;
  let estStateIncomeTax: number;
  let estTotalTax: number;

  if (input.taxBreakdown) {
    // Use accurate tax calculations from withholding hook
    // This correctly handles states with 0% income tax (TN, TX, FL, etc.)
    estSETax = input.taxBreakdown.selfEmployment;
    estFederalIncomeTax = input.taxBreakdown.federalIncome;
    estStateIncomeTax = input.taxBreakdown.stateIncome;
    estTotalTax = input.taxBreakdown.total;
  } else {
    // Fallback: simplified calculations (should rarely be used)
    // Estimated SE tax (15.3% of SE tax basis, capped at SS wage base)
    const SS_WAGE_BASE_2025 = 168600;
    const ssTax = Math.min(seTaxBasis, SS_WAGE_BASE_2025) * 0.124; // 12.4% SS
    const medicareTax = seTaxBasis * 0.029; // 2.9% Medicare
    estSETax = ssTax + medicareTax;

    // Estimated federal income tax (simplified - 12% bracket assumption)
    estFederalIncomeTax = Math.max(0, (netProfit - estSETax * 0.5) * 0.12);

    // State income tax: DO NOT use hardcoded rate - default to 0
    // Caller should always provide taxBreakdown for accurate state tax
    estStateIncomeTax = 0;

    estTotalTax = estSETax + estFederalIncomeTax + estStateIncomeTax;
  }

  // Suggested set-aside amount
  const setAsideSuggested = Math.max(0, estTotalTax);

  // ============================================================================
  // RETURN SCHEDULE C SUMMARY
  // ============================================================================

  return {
    tax_year: taxYear,
    filing_status: filingStatus,
    state_of_residence: stateOfResidence,
    standard_or_itemized: standardOrItemized,

    // Income
    gross_receipts: Math.round(totalGrossReceipts * 100) / 100,
    returns_and_allowances: Math.round(returnsAndAllowances * 100) / 100,
    other_income: 0, // Separate line if needed
    total_income: Math.round(totalIncome * 100) / 100,

    // Expenses (all rounded to cents)
    advertising: Math.round(expenseCategories.advertising * 100) / 100,
    car_truck: Math.round(expenseCategories.car_truck * 100) / 100,
    commissions: Math.round(expenseCategories.commissions * 100) / 100,
    contract_labor: Math.round(expenseCategories.contract_labor * 100) / 100,
    depreciation: Math.round(expenseCategories.depreciation * 100) / 100,
    employee_benefit: Math.round(expenseCategories.employee_benefit * 100) / 100,
    insurance_other: Math.round(expenseCategories.insurance_other * 100) / 100,
    interest_mortgage: Math.round(expenseCategories.interest_mortgage * 100) / 100,
    interest_other: Math.round(expenseCategories.interest_other * 100) / 100,
    legal_professional: Math.round(expenseCategories.legal_professional * 100) / 100,
    office_expense: Math.round(expenseCategories.office_expense * 100) / 100,
    rent_vehicles: Math.round(expenseCategories.rent_vehicles * 100) / 100,
    rent_other: Math.round(expenseCategories.rent_other * 100) / 100,
    repairs_maintenance: Math.round(expenseCategories.repairs_maintenance * 100) / 100,
    supplies: Math.round(expenseCategories.supplies * 100) / 100,
    taxes_licenses: Math.round(expenseCategories.taxes_licenses * 100) / 100,
    travel: Math.round(expenseCategories.travel * 100) / 100,
    meals_allowed: Math.round(expenseCategories.meals_allowed * 100) / 100,
    utilities: Math.round(expenseCategories.utilities * 100) / 100,
    wages: Math.round(expenseCategories.wages * 100) / 100,
    other_expenses_total: Math.round(expenseCategories.other_expenses_total * 100) / 100,
    total_expenses: Math.round(totalExpenses * 100) / 100,

    // Net profit
    net_profit: Math.round(netProfit * 100) / 100,

    // Tax estimates
    se_tax_basis: Math.round(seTaxBasis * 100) / 100,
    est_se_tax: Math.round(estSETax * 100) / 100,
    est_federal_income_tax: Math.round(estFederalIncomeTax * 100) / 100,
    est_state_income_tax: Math.round(estStateIncomeTax * 100) / 100,
    est_total_tax: Math.round(estTotalTax * 100) / 100,
    set_aside_suggested: Math.round(setAsideSuggested * 100) / 100,
  };
}

// ============================================================================
// DOWNLOAD UTILITIES
// ============================================================================

/**
 * Download a CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download all CSVs as a bundle
 */
export function downloadAllCSVs(
  gigs: GigExportRow[],
  expenses: ExpenseExportRow[],
  mileage: MileageExportRow[],
  payers: PayerExportRow[],
  scheduleCSummary: ScheduleCSummaryRow,
  taxYear: number
): void {
  const prefix = `gigledger_${taxYear}`;

  // Download each CSV with a small delay to avoid browser blocking
  setTimeout(() => downloadCSV(generateGigsCSV(gigs), `${prefix}_gigs.csv`), 0);
  setTimeout(() => downloadCSV(generateExpensesCSV(expenses), `${prefix}_expenses.csv`), 200);
  setTimeout(() => downloadCSV(generateMileageCSV(mileage), `${prefix}_mileage.csv`), 400);
  setTimeout(() => downloadCSV(generatePayersCSV(payers), `${prefix}_payers.csv`), 600);
  setTimeout(() => downloadCSV(generateScheduleCSummaryCSV(scheduleCSummary), `${prefix}_schedule_c_summary.csv`), 800);
}
