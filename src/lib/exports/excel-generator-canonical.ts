import ExcelJS from 'exceljs';
import type { TaxExportPackage } from './taxExportPackage';

/**
 * Excel Generator (from canonical TaxExportPackage)
 * Generates multi-sheet Excel workbook with all export data
 */

export async function generateExcelFromPackage(pkg: TaxExportPackage): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Schedule C Summary
  const scheduleCData = pkg.scheduleCLineItems.map((item) => ({
    'Ref #': item.scheduleCRefNumber,
    'Line Name': item.scheduleCLineName,
    'Description': item.lineDescription,
    'Raw Amount': item.rawSignedAmount,
    'Amount for Entry': item.amountForEntry,
    'Notes': item.scheduleCRefNumber === 302 
      ? "See 'Other Expenses Breakdown' sheet for itemized detail"
      : (item.notes || ''),
  }));
  const scheduleCSheet = workbook.addWorksheet('Schedule C Summary');
  scheduleCSheet.addRow(Object.keys(scheduleCData[0] || {}));
  scheduleCData.forEach(row => scheduleCSheet.addRow(Object.values(row)));

  // Sheet 2: Payer Summary
  const payerSummaryData = pkg.payerSummaryRows.map((r) => ({
    'Payer ID': r.payerId || '',
    'Payer Name': r.payerName || '',
    'Email': r.payerEmail || '',
    'Phone': r.payerPhone || '',
    'Payments': r.paymentsCount,
    'Gross Amount': r.grossAmount,
    'Fees': r.feesTotal,
    'Net Amount': r.netAmount,
    'First Payment': r.firstPaymentDate,
    'Last Payment': r.lastPaymentDate,
    'Notes': r.notes || '',
  }));
  const payerSummarySheet = workbook.addWorksheet('Payer Summary');
  if (payerSummaryData.length > 0) {
    payerSummarySheet.addRow(Object.keys(payerSummaryData[0]));
    payerSummaryData.forEach(row => payerSummarySheet.addRow(Object.values(row)));
  }

  // Sheet 3: Mileage Summary
  const mileageSummaryData = [{
    'Tax Year': pkg.mileageSummary.taxYear,
    'Total Miles': pkg.mileageSummary.totalBusinessMiles,
    'Rate': pkg.mileageSummary.standardRateUsed,
    'Deduction': pkg.mileageSummary.mileageDeductionAmount,
    'Entries': pkg.mileageSummary.entriesCount,
    'Has Estimates': pkg.mileageSummary.isEstimateAny,
    'Notes': pkg.mileageSummary.notes,
  }];
  const mileageSummarySheet = workbook.addWorksheet('Mileage Summary');
  mileageSummarySheet.addRow(Object.keys(mileageSummaryData[0]));
  mileageSummaryData.forEach(row => mileageSummarySheet.addRow(Object.values(row)));

  // Sheet 4: Income Detail
  const incomeData = pkg.incomeRows.map((r) => ({
    'ID': r.id,
    'Source': r.source,
    'Date': r.receivedDate,
    'Payer ID': r.payerId || '',
    'Payer Name': r.payerName || '',
    'Payer Email': r.payerEmail || '',
    'Payer Phone': r.payerPhone || '',
    'Description': r.description,
    'Amount': r.amount,
    'Fees': r.fees,
    'Net': r.netAmount,
    'Invoice ID': r.relatedInvoiceId || '',
    'Gig ID': r.relatedGigId || '',
  }));
  const incomeSheet = workbook.addWorksheet('Income');
  if (incomeData.length > 0) {
    incomeSheet.addRow(Object.keys(incomeData[0]));
    incomeData.forEach(row => incomeSheet.addRow(Object.values(row)));
  }

  // Sheet 5: Expense Detail
  const expenseData = pkg.expenseRows.map((r) => ({
    'ID': r.id,
    'Date': r.date,
    'Merchant': r.merchant || '',
    'Description': r.description,
    'Category': r.glCategory,
    'Sch C Ref': r.scheduleCRefNumber,
    'Amount': r.amount,
    'Deductible %': r.deductiblePercent,
    'Deductible': r.deductibleAmount,
    'Receipt': r.receiptUrl || '',
    'Notes': r.notes || '',
    'Gig ID': r.relatedGigId || '',
    'Asset Review': r.potentialAssetReview,
    'Review Reason': r.potentialAssetReason || '',
  }));
  const expenseSheet = workbook.addWorksheet('Expenses');
  if (expenseData.length > 0) {
    expenseSheet.addRow(Object.keys(expenseData[0]));
    expenseData.forEach(row => expenseSheet.addRow(Object.values(row)));
  }

  // Sheet 6: Mileage Detail
  const mileageData = pkg.mileageRows.map((r) => ({
    'ID': r.id,
    'Date': r.date,
    'Origin': r.origin || '',
    'Destination': r.destination || '',
    'Miles': r.miles,
    'Rate': r.rate,
    'Deduction': r.deductionAmount,
    'Purpose': r.purpose || '',
    'Estimate': r.isEstimate,
    'Notes': r.notes || '',
    'Gig ID': r.relatedGigId || '',
  }));
  const mileageSheet = workbook.addWorksheet('Mileage');
  if (mileageData.length > 0) {
    mileageSheet.addRow(Object.keys(mileageData[0]));
    mileageData.forEach(row => mileageSheet.addRow(Object.values(row)));
  }

  // Sheet 7: Other Expenses Breakdown
  const otherExpensesData = pkg.scheduleC.otherExpensesBreakdown.map((item) => ({
    'Ref #': 302,
    'Category': item.name,
    'Raw Amount': -item.amount,
    'Amount for Entry': Math.abs(item.amount),
    'Notes': 'Supporting detail for Line 302 - enter ONLY the 302 total from Schedule C Summary',
  }));
  const otherExpensesSheet = workbook.addWorksheet('Other Expenses Breakdown');
  if (otherExpensesData.length > 0) {
    otherExpensesSheet.addRow(Object.keys(otherExpensesData[0]));
    otherExpensesData.forEach(row => otherExpensesSheet.addRow(Object.values(row)));
  }

  // Generate binary Excel file
  const excelBuffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(excelBuffer);
}

export async function downloadExcelFromPackage(pkg: TaxExportPackage): Promise<void> {
  const { downloadBinaryFile } = await import('./webDownloadHelpers');
  const excelBytes = await generateExcelFromPackage(pkg);
  await downloadBinaryFile(
    excelBytes,
    `Bozzy_Export_${pkg.metadata.taxYear}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}
