import type { TaxExportPackage } from './taxExportPackage';
import { stringifyCsv } from './textCsv';
import { downloadCSV } from './webDownloadHelpers';

/**
 * CSV Bundle Generator (from canonical TaxExportPackage)
 * Generates multiple CSV files for CPA sharing
 */

export function generateCSVBundle(pkg: TaxExportPackage): void {
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
  downloadCSV(stringifyCsv(scheduleCRows), `ScheduleC_Summary_${taxYear}.csv`);

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
  downloadCSV(stringifyCsv(payerSummaryRows), `Payer_Summary_${taxYear}.csv`);

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
  downloadCSV(stringifyCsv(mileageSummaryRows), `Mileage_Summary_${taxYear}.csv`);

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
  downloadCSV(stringifyCsv(incomeRows), `Income_Detail_${taxYear}.csv`);

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
  downloadCSV(stringifyCsv(expenseRows), `Expense_Detail_${taxYear}.csv`);

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
  downloadCSV(stringifyCsv(mileageRows), `Mileage_${taxYear}.csv`);
}
