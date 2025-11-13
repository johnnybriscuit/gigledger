/**
 * Excel Export Generator
 * Generates a multi-sheet Excel workbook with all export data
 * Uses SheetJS (xlsx) library for Excel generation
 */

import type { GigExportRow, ExpenseExportRow, MileageExportRow, PayerExportRow, ScheduleCSummaryRow } from './schemas';

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
  const { gigs, expenses, mileage, payers, scheduleC, taxYear } = input;

  // Sheet 1: Schedule C Summary
  const scheduleCSheet = [
    ['Schedule C Summary', '', '', ''],
    ['Tax Year:', taxYear, '', ''],
    ['Generated:', new Date().toLocaleDateString(), '', ''],
    ['', '', '', ''],
    ['INCOME', '', '', ''],
    ['Gross Receipts', formatCurrency(scheduleC.gross_receipts), '', ''],
    ['Other Income', formatCurrency(scheduleC.other_income), '', ''],
    ['Total Income', formatCurrency(scheduleC.total_income), '', ''],
    ['', '', '', ''],
    ['EXPENSES', '', '', ''],
    ['Advertising', formatCurrency(scheduleC.advertising), '', ''],
    ['Car and Truck', formatCurrency(scheduleC.car_truck), '', ''],
    ['Commissions', formatCurrency(scheduleC.commissions), '', ''],
    ['Depreciation', formatCurrency(scheduleC.depreciation), '', ''],
    ['Insurance', formatCurrency(scheduleC.insurance_other), '', ''],
    ['Legal & Professional', formatCurrency(scheduleC.legal_professional), '', ''],
    ['Office Expense', formatCurrency(scheduleC.office_expense), '', ''],
    ['Repairs & Maintenance', formatCurrency(scheduleC.repairs_maintenance), '', ''],
    ['Supplies', formatCurrency(scheduleC.supplies), '', ''],
    ['Taxes & Licenses', formatCurrency(scheduleC.taxes_licenses), '', ''],
    ['Travel', formatCurrency(scheduleC.travel), '', ''],
    ['Meals (50% allowed)', formatCurrency(scheduleC.meals_allowed), '', ''],
    ['Utilities', formatCurrency(scheduleC.utilities), '', ''],
    ['Wages', formatCurrency(scheduleC.wages), '', ''],
    ['Other Expenses', formatCurrency(scheduleC.other_expenses_total), '', ''],
    ['Total Expenses', formatCurrency(scheduleC.total_expenses), '', ''],
    ['', '', '', ''],
    ['NET PROFIT', formatCurrency(scheduleC.net_profit), '', ''],
    ['', '', '', ''],
    ['TAX ESTIMATES', '', '', ''],
    ['Self-Employment Tax', formatCurrency(scheduleC.est_se_tax), '', ''],
    ['Federal Income Tax', formatCurrency(scheduleC.est_federal_income_tax), '', ''],
    ['State Income Tax', formatCurrency(scheduleC.est_state_income_tax), '', ''],
    ['Total Tax', formatCurrency(scheduleC.est_total_tax), '', ''],
    ['Suggested Set Aside', formatCurrency(scheduleC.set_aside_suggested), '', ''],
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
