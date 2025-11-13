/**
 * Excel Export Generator
 * Generates a multi-sheet Excel workbook with all export data
 * Uses SheetJS (xlsx) library for Excel generation
 */

import type { GigExportRow, ExpenseExportRow, MileageExportRow, PayerExportRow, ScheduleCSummaryRow } from './schemas';
import type { WithholdingBreakdown } from '../tax/withholding';

// Type aliases for easier use with actual data from hooks
type GigExport = any; // Will use actual data from useExports hook
type ExpenseExport = any;
type MileageExport = any;
type PayerExport = any;

export interface ExcelGeneratorInput {
  gigs: GigExport[];
  expenses: ExpenseExport[];
  mileage: MileageExport[];
  payers: PayerExport[];
  scheduleC: ScheduleCSummaryRow;
  taxYear: number;
  taxBreakdown?: WithholdingBreakdown | null;
}

/**
 * Format currency for Excel (as number, not string)
 */
function formatCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Generate Excel workbook with multiple sheets
 * Returns a data structure that can be converted to Excel
 */
export function generateExcelData(input: ExcelGeneratorInput) {
  const { gigs, expenses, mileage, payers, scheduleC, taxYear, taxBreakdown } = input;
  
  // Calculate Schedule C summary from raw data if scheduleC is empty/invalid
  const calculateScheduleC = () => {
    // Income
    const grossReceipts = gigs.reduce((sum, g) => sum + (g.gross_amount || 0) + (g.tips || 0) + (g.per_diem || 0) + (g.other_income || 0), 0);
    const fees = gigs.reduce((sum, g) => sum + (g.fees || 0), 0);
    const totalIncome = grossReceipts - fees;
    
    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.amount;
    });
    
    // Mileage deduction
    const mileageDeduction = mileage.reduce((sum, m) => sum + (m.deduction_amount || m.miles * 0.67), 0);
    
    // Map to Schedule C lines
    const advertising = expensesByCategory['Marketing'] || 0;
    const carTruck = mileageDeduction;
    const supplies = expensesByCategory['Supplies'] || 0;
    const travel = (expensesByCategory['Travel'] || 0) + (expensesByCategory['Lodging'] || 0);
    const meals = (expensesByCategory['Meals'] || 0) * 0.5; // 50% deductible
    const officeExpense = expensesByCategory['Software'] || 0;
    const legalProfessional = expensesByCategory['Fees'] || 0;
    const otherExpenses = Object.entries(expensesByCategory)
      .filter(([cat]) => !['Marketing', 'Supplies', 'Travel', 'Lodging', 'Meals', 'Software', 'Fees'].includes(cat))
      .reduce((sum, [, amount]) => sum + amount, 0);
    
    const totalExpenses = advertising + carTruck + supplies + travel + meals + officeExpense + legalProfessional + otherExpenses;
    const netProfit = totalIncome - totalExpenses;
    
    // Use tax breakdown from useWithholding hook (same as dashboard)
    const seTax = taxBreakdown?.selfEmployment || 0;
    const estimatedIncomeTax = taxBreakdown?.federalIncome || 0;
    const estimatedStateTax = taxBreakdown?.stateIncome || 0;
    const totalTax = taxBreakdown?.total || 0;
    
    return {
      gross_receipts: grossReceipts - fees,
      other_income: 0,
      total_income: totalIncome,
      advertising,
      car_truck: carTruck,
      commissions: 0,
      depreciation: 0,
      insurance_other: 0,
      legal_professional: legalProfessional,
      office_expense: officeExpense,
      repairs_maintenance: 0,
      supplies,
      taxes_licenses: 0,
      travel,
      meals_allowed: meals,
      utilities: 0,
      wages: 0,
      other_expenses_total: otherExpenses,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      est_se_tax: seTax,
      est_federal_income_tax: estimatedIncomeTax,
      est_state_income_tax: estimatedStateTax,
      est_total_tax: totalTax,
      set_aside_suggested: totalTax,
    };
  };
  
  // Use calculated data if scheduleC is empty or has zero values
  const scheduleCSummary = (scheduleC && scheduleC.gross_receipts > 0) ? scheduleC : calculateScheduleC();

  // Sheet 1: Schedule C Summary
  const scheduleCSheet = [
    ['Schedule C Summary', '', '', ''],
    ['Tax Year:', taxYear, '', ''],
    ['Generated:', new Date().toLocaleDateString(), '', ''],
    ['', '', '', ''],
    ['INCOME', '', '', ''],
    ['Gross Receipts', formatCurrency(scheduleCSummary.gross_receipts), '', ''],
    ['Other Income', formatCurrency(scheduleCSummary.other_income), '', ''],
    ['Total Income', formatCurrency(scheduleCSummary.total_income), '', ''],
    ['', '', '', ''],
    ['EXPENSES', '', '', ''],
    ['Advertising', formatCurrency(scheduleCSummary.advertising), '', ''],
    ['Car and Truck', formatCurrency(scheduleCSummary.car_truck), '', ''],
    ['Commissions', formatCurrency(scheduleCSummary.commissions), '', ''],
    ['Depreciation', formatCurrency(scheduleCSummary.depreciation), '', ''],
    ['Insurance', formatCurrency(scheduleCSummary.insurance_other), '', ''],
    ['Legal & Professional', formatCurrency(scheduleCSummary.legal_professional), '', ''],
    ['Office Expense', formatCurrency(scheduleCSummary.office_expense), '', ''],
    ['Repairs & Maintenance', formatCurrency(scheduleCSummary.repairs_maintenance), '', ''],
    ['Supplies', formatCurrency(scheduleCSummary.supplies), '', ''],
    ['Taxes & Licenses', formatCurrency(scheduleCSummary.taxes_licenses), '', ''],
    ['Travel', formatCurrency(scheduleCSummary.travel), '', ''],
    ['Meals (50% allowed)', formatCurrency(scheduleCSummary.meals_allowed), '', ''],
    ['Utilities', formatCurrency(scheduleCSummary.utilities), '', ''],
    ['Wages', formatCurrency(scheduleCSummary.wages), '', ''],
    ['Other Expenses', formatCurrency(scheduleCSummary.other_expenses_total), '', ''],
    ['Total Expenses', formatCurrency(scheduleCSummary.total_expenses), '', ''],
    ['', '', '', ''],
    ['NET PROFIT', formatCurrency(scheduleCSummary.net_profit), '', ''],
    ['', '', '', ''],
    ['TAX ESTIMATES', '', '', ''],
    ['Self-Employment Tax', formatCurrency(scheduleCSummary.est_se_tax), '', ''],
    ['Federal Income Tax', formatCurrency(scheduleCSummary.est_federal_income_tax), '', ''],
    ['State Income Tax', formatCurrency(scheduleCSummary.est_state_income_tax), '', ''],
    ['Total Tax', formatCurrency(scheduleCSummary.est_total_tax), '', ''],
    ['Suggested Set Aside', formatCurrency(scheduleCSummary.set_aside_suggested), '', ''],
  ];

  // Sheet 2: Gigs
  const gigsSheet = [
    ['Date', 'Payer', 'Title', 'Location', 'Gross', 'Tips', 'Fees', 'Per Diem', 'Other Income', 'Net', 'Paid', 'Notes'],
    ...gigs.map(g => [
      g.date,
      g.payer,
      g.title || '',
      g.city_state || '',
      formatCurrency(g.gross_amount),
      formatCurrency(g.tips || 0),
      formatCurrency(g.fees || 0),
      formatCurrency(g.per_diem || 0),
      formatCurrency(g.other_income || 0),
      formatCurrency(g.net_amount),
      g.paid ? 'Yes' : 'No',
      g.notes || '',
    ]),
  ];

  // Sheet 3: Expenses
  const expensesSheet = [
    ['Date', 'Category', 'Vendor', 'Description', 'Amount', 'Schedule C Line', 'Notes'],
    ...expenses.map(e => [
      e.date,
      e.category,
      e.vendor || '',
      e.description,
      formatCurrency(e.amount),
      e.irs_schedule_c_line || '27a',
      e.notes || '',
    ]),
  ];

  // Sheet 4: Mileage
  const mileageSheet = [
    ['Date', 'Miles', 'Purpose', 'Deduction', 'Notes'],
    ...mileage.map(m => [
      m.date,
      m.miles,
      m.purpose || '',
      formatCurrency(m.deduction_amount),
      m.notes || '',
    ]),
  ];

  // Sheet 5: Payers
  const payersSheet = [
    ['Name', 'Type', 'Email', 'Expect 1099', 'EIN/SSN', 'Notes'],
    ...payers.map(p => [
      p.name,
      p.type,
      p.contact_email || '',
      p.expect_1099 ? 'Yes' : 'No',
      p.tax_id || '',
      p.notes || '',
    ]),
  ];

  return {
    'Schedule C Summary': scheduleCSheet,
    'Gigs': gigsSheet,
    'Expenses': expensesSheet,
    'Mileage': mileageSheet,
    'Payers': payersSheet,
  };
}

/**
 * Download Excel file using SheetJS
 * This requires the xlsx library to be installed
 */
export async function downloadExcel(input: ExcelGeneratorInput): Promise<void> {
  try {
    // Dynamically import xlsx library
    const XLSX = await import('xlsx');
    
    const data = generateExcelData(input);
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Add each sheet
    Object.entries(data).forEach(([sheetName, sheetData]) => {
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Set column widths
      const colWidths = sheetData[0].map((_, colIndex) => {
        const maxLength = Math.max(
          ...sheetData.map(row => {
            const cell = row[colIndex];
            return cell ? String(cell).length : 0;
          })
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `gigledger_${input.taxYear}_export.xlsx`);
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Failed to generate Excel file. Please make sure you have a modern browser.');
  }
}
