import * as XLSX from 'xlsx';
import type { TaxExportPackage } from './taxExportPackage';

/**
 * Excel Generator (from canonical TaxExportPackage)
 * Generates multi-sheet Excel workbook with all export data
 */

export function generateExcelFromPackage(pkg: TaxExportPackage): Uint8Array {
  const workbook = XLSX.utils.book_new();

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
  const scheduleCSheet = XLSX.utils.json_to_sheet(scheduleCData);
  XLSX.utils.book_append_sheet(workbook, scheduleCSheet, 'Schedule C Summary');

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
  const payerSummarySheet = XLSX.utils.json_to_sheet(payerSummaryData);
  XLSX.utils.book_append_sheet(workbook, payerSummarySheet, 'Payer Summary');

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
  const mileageSummarySheet = XLSX.utils.json_to_sheet(mileageSummaryData);
  XLSX.utils.book_append_sheet(workbook, mileageSummarySheet, 'Mileage Summary');

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
  const incomeSheet = XLSX.utils.json_to_sheet(incomeData);
  XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Income');

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
  const expenseSheet = XLSX.utils.json_to_sheet(expenseData);
  XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses');

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
  const mileageSheet = XLSX.utils.json_to_sheet(mileageData);
  XLSX.utils.book_append_sheet(workbook, mileageSheet, 'Mileage');

  // Sheet 7: Other Expenses Breakdown
  const otherExpensesData = pkg.scheduleC.otherExpensesBreakdown.map((item) => ({
    'Ref #': 302,
    'Category': item.name,
    'Raw Amount': -item.amount,
    'Amount for Entry': Math.abs(item.amount),
    'Notes': 'Supporting detail for Line 302 - enter ONLY the 302 total from Schedule C Summary',
  }));
  const otherExpensesSheet = XLSX.utils.json_to_sheet(otherExpensesData);
  XLSX.utils.book_append_sheet(workbook, otherExpensesSheet, 'Other Expenses Breakdown');

  // Generate binary Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

export function downloadExcelFromPackage(pkg: TaxExportPackage): void {
  const excelBytes = generateExcelFromPackage(pkg);
  const blob = new Blob([excelBytes as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `GigLedger_Export_${pkg.metadata.taxYear}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
