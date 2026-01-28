import JSZip from 'jszip';
import type { TaxExportPackage } from './taxExportPackage';
import { stringifyCsv } from './textCsv';
import { downloadZip } from './webDownloadHelpers';

/**
 * CSV Bundle Generator (from canonical TaxExportPackage)
 * Generates a single ZIP file containing all CSV exports for CPA sharing
 */

export async function generateCSVBundle(pkg: TaxExportPackage): Promise<void> {
  const zip = new JSZip();
  const { taxYear } = pkg.metadata;

  // Schedule C Summary CSV
  const scheduleCRows = pkg.scheduleCLineItems.map((item) => ({
    schedule_c_ref_number: item.scheduleCRefNumber,
    schedule_c_line_name: item.scheduleCLineName,
    line_description: item.lineDescription,
    raw_signed_amount: item.rawSignedAmount,
    amount_for_entry: item.amountForEntry,
    notes: item.notes || '',
  }));
  zip.file(`ScheduleC_Summary_${taxYear}.csv`, stringifyCsv(scheduleCRows));

  // Other Expenses Breakdown CSV
  const otherExpensesRows = pkg.scheduleC.otherExpensesBreakdown.map((item) => ({
    schedule_c_ref_number: 302,
    category_name: item.name,
    raw_signed_amount: -item.amount,
    amount_for_entry: Math.abs(item.amount),
    notes: 'Supporting detail for Line 302 - enter ONLY the 302 total from ScheduleC_Summary',
  }));
  zip.file(`Other_Expenses_Breakdown_${taxYear}.csv`, stringifyCsv(otherExpensesRows));

  // Payer Summary CSV
  const payerSummaryRows = pkg.payerSummaryRows.map((r) => ({
    payer_id: r.payerId || '',
    payer_name: r.payerName || '',
    payer_email: r.payerEmail || '',
    payer_phone: r.payerPhone || '',
    payments_count: r.paymentsCount,
    gross_amount: r.grossAmount,
    fees_total: r.feesTotal,
    net_amount: r.netAmount,
    first_payment_date: r.firstPaymentDate,
    last_payment_date: r.lastPaymentDate,
    notes: r.notes || '',
  }));
  zip.file(`Payer_Summary_${taxYear}.csv`, stringifyCsv(payerSummaryRows));

  // Mileage Summary CSV
  const mileageSummaryRows = [{
    tax_year: pkg.mileageSummary.taxYear,
    total_business_miles: pkg.mileageSummary.totalBusinessMiles,
    standard_rate_used: pkg.mileageSummary.standardRateUsed,
    mileage_deduction_amount: pkg.mileageSummary.mileageDeductionAmount,
    entries_count: pkg.mileageSummary.entriesCount,
    is_estimate_any: pkg.mileageSummary.isEstimateAny,
    notes: pkg.mileageSummary.notes,
  }];
  zip.file(`Mileage_Summary_${taxYear}.csv`, stringifyCsv(mileageSummaryRows));

  // Income Detail CSV
  const incomeRows = pkg.incomeRows.map((r) => ({
    id: r.id,
    source: r.source,
    received_date: r.receivedDate,
    payer_id: r.payerId || '',
    payer_name: r.payerName || '',
    payer_email: r.payerEmail || '',
    payer_phone: r.payerPhone || '',
    description: r.description,
    amount: r.amount,
    fees: r.fees,
    net_amount: r.netAmount,
    related_invoice_id: r.relatedInvoiceId || '',
    related_gig_id: r.relatedGigId || '',
  }));
  zip.file(`Income_Detail_${taxYear}.csv`, stringifyCsv(incomeRows));

  // Expense Detail CSV
  const expenseRows = pkg.expenseRows.map((r) => ({
    id: r.id,
    date: r.date,
    merchant: r.merchant || '',
    description: r.description,
    gl_category: r.glCategory,
    schedule_c_ref_number: r.scheduleCRefNumber,
    amount: r.amount,
    deductible_percent: r.deductiblePercent,
    deductible_amount: r.deductibleAmount,
    receipt_url: r.receiptUrl || '',
    notes: r.notes || '',
    related_gig_id: r.relatedGigId || '',
    potential_asset_review: r.potentialAssetReview,
    potential_asset_reason: r.potentialAssetReason || '',
  }));
  zip.file(`Expense_Detail_${taxYear}.csv`, stringifyCsv(expenseRows));

  // Mileage Detail CSV
  const mileageRows = pkg.mileageRows.map((r) => ({
    id: r.id,
    date: r.date,
    origin: r.origin || '',
    destination: r.destination || '',
    miles: r.miles,
    rate: r.rate,
    deduction_amount: r.deductionAmount,
    purpose: r.purpose || '',
    is_estimate: r.isEstimate,
    notes: r.notes || '',
    related_gig_id: r.relatedGigId || '',
  }));
  zip.file(`Mileage_${taxYear}.csv`, stringifyCsv(mileageRows));

  // Generate and download the ZIP file
  const zipBytes = await zip.generateAsync({ type: 'uint8array' });
  downloadZip(zipBytes, `Bozzy_CSV_Bundle_${taxYear}.zip`);
}
