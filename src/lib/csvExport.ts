/**
 * CSV Export Utilities
 * Generates CSV files from export data
 */

import type { GigExport, ExpenseExport, MileageExport, PayerExport, ScheduleCSummary } from '../hooks/useExports';

/**
 * Escapes CSV field values
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Converts array of objects to CSV string
 */
function arrayToCSV<T extends Record<string, any>>(data: T[], headers: string[]): string {
  if (data.length === 0) {
    return headers.join(',') + '\n';
  }

  const rows = [headers.join(',')];

  for (const item of data) {
    const row = headers.map((header) => {
      const key = header.toLowerCase().replace(/ /g, '_');
      return escapeCSVField(item[key]);
    });
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Generate gigs CSV
 */
export function generateGigsCSV(gigs: GigExport[]): string {
  const headers = ['Date', 'Payer', 'City_State', 'Gross_Amount', 'Per_Diem', 'Tips', 'Fees', 'Other_Income', 'Net_Amount', 'Notes'];
  return arrayToCSV(gigs, headers);
}

/**
 * Generate expenses CSV
 */
export function generateExpensesCSV(expenses: ExpenseExport[]): string {
  const headers = ['Date', 'Category', 'Vendor', 'Description', 'Amount', 'Receipt_URL', 'Notes'];
  return arrayToCSV(expenses, headers);
}

/**
 * Generate mileage CSV
 */
export function generateMileageCSV(mileage: MileageExport[]): string {
  const headers = ['Date', 'Origin', 'Destination', 'Purpose', 'Miles', 'Deduction_Amount', 'Notes'];
  return arrayToCSV(mileage, headers);
}

/**
 * Generate payers CSV
 */
export function generatePayersCSV(payers: PayerExport[]): string {
  const headers = ['Name', 'Type', 'Contact_Email', 'Expect_1099', 'Notes'];
  return arrayToCSV(payers, headers);
}

/**
 * Generate Schedule C summary CSV
 */
export function generateScheduleCSV(summary: ScheduleCSummary[]): string {
  const headers = ['Line_Name', 'Amount'];
  return arrayToCSV(summary, headers);
}

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
 * Generate and download all CSVs as individual files
 */
export function downloadAllCSVs(
  gigs: GigExport[],
  expenses: ExpenseExport[],
  mileage: MileageExport[],
  payers: PayerExport[],
  scheduleC: ScheduleCSummary[],
  taxYear: number
): void {
  const prefix = `gigledger_${taxYear}`;

  // Download each CSV with a small delay to avoid browser blocking
  setTimeout(() => downloadCSV(generateGigsCSV(gigs), `${prefix}_gigs.csv`), 0);
  setTimeout(() => downloadCSV(generateExpensesCSV(expenses), `${prefix}_expenses.csv`), 200);
  setTimeout(() => downloadCSV(generateMileageCSV(mileage), `${prefix}_mileage.csv`), 400);
  setTimeout(() => downloadCSV(generatePayersCSV(payers), `${prefix}_payers.csv`), 600);
  setTimeout(() => downloadCSV(generateScheduleCSV(scheduleC), `${prefix}_schedule_c.csv`), 800);
}

/**
 * Generate JSON backup of all data
 */
export function generateJSONBackup(
  gigs: GigExport[],
  expenses: ExpenseExport[],
  mileage: MileageExport[],
  payers: PayerExport[],
  scheduleC: ScheduleCSummary[]
): string {
  const backup = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    data: {
      gigs,
      expenses,
      mileage,
      payers,
      scheduleC,
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Download JSON backup
 */
export function downloadJSONBackup(
  gigs: GigExport[],
  expenses: ExpenseExport[],
  mileage: MileageExport[],
  payers: PayerExport[],
  scheduleC: ScheduleCSummary[],
  taxYear: number
): void {
  const content = generateJSONBackup(gigs, expenses, mileage, payers, scheduleC);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `gigledger_${taxYear}_backup.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
