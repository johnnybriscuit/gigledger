import JSZip from 'jszip';
import type { TaxExportPackage } from './taxExportPackage';
import { generateScheduleCSummaryPdf } from './taxpdf';
import { stringifyCsv } from './textCsv';

export async function generateTaxActPackZip(input: {
  pkg: TaxExportPackage;
  appVersion: string;
}): Promise<{ filename: string; bytes: Uint8Array }> {
  const { pkg, appVersion } = input;
  const taxYear = pkg.metadata.taxYear;

  const zip = new JSZip();

  // Add Schedule C Summary CSV (with amount_for_entry for manual entry)
  const scheduleSummaryRows = buildScheduleCSummaryRows(pkg);
  zip.file(`ScheduleC_Summary_${taxYear}.csv`, stringifyCsv(scheduleSummaryRows));

  // Add Payer Summary CSV (for 1099 reconciliation)
  const payerSummaryRows = buildPayerSummaryRows(pkg);
  zip.file(`Payer_Summary_${taxYear}.csv`, stringifyCsv(payerSummaryRows));

  // Add Mileage Summary CSV (TaxAct-friendly summary)
  const mileageSummaryRows = buildMileageSummaryRows(pkg);
  zip.file(`Mileage_Summary_${taxYear}.csv`, stringifyCsv(mileageSummaryRows));

  // Add Income Detail CSV (with payer info)
  zip.file(`Income_Detail_${taxYear}.csv`, stringifyCsv(buildIncomeDetailRows(pkg)));

  // Add Expense Detail CSV (with asset review flags)
  zip.file(`Expense_Detail_${taxYear}.csv`, stringifyCsv(buildExpenseDetailRows(pkg)));

  // Add Mileage Detail CSV
  zip.file(`Mileage_${taxYear}.csv`, stringifyCsv(buildMileageRows(pkg)));

  // Add PDF Summary
  const pdfBytes = await generateScheduleCSummaryPdf({ pkg, appVersion });
  zip.file(`PDF_Summary_${taxYear}.pdf`, pdfBytes);

  // Add README
  zip.file(`README_TaxAct_${taxYear}.txt`, buildReadmeText(pkg));

  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return { filename: `gigledger_taxact_pack_${taxYear}.zip`, bytes };
}

function buildScheduleCSummaryRows(pkg: TaxExportPackage) {
  return pkg.scheduleCLineItems.map((item) => ({
    schedule_c_ref_number: item.scheduleCRefNumber,
    schedule_c_line_name: item.scheduleCLineName,
    line_description: item.lineDescription,
    raw_signed_amount: item.rawSignedAmount,
    amount_for_entry: item.amountForEntry,
    notes: item.notes || '',
  }));
}

function buildExpenseDetailRows(pkg: TaxExportPackage) {
  return pkg.expenseRows.map((r) => ({
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
}

function buildIncomeDetailRows(pkg: TaxExportPackage) {
  return pkg.incomeRows.map((r) => ({
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
}

function buildPayerSummaryRows(pkg: TaxExportPackage) {
  return pkg.payerSummaryRows.map((r) => ({
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
}

function buildMileageSummaryRows(pkg: TaxExportPackage) {
  return [{
    tax_year: pkg.mileageSummary.taxYear,
    total_business_miles: pkg.mileageSummary.totalBusinessMiles,
    standard_rate_used: pkg.mileageSummary.standardRateUsed,
    mileage_deduction_amount: pkg.mileageSummary.mileageDeductionAmount,
    entries_count: pkg.mileageSummary.entriesCount,
    is_estimate_any: pkg.mileageSummary.isEstimateAny,
    notes: pkg.mileageSummary.notes,
  }];
}

function buildMileageRows(pkg: TaxExportPackage) {
  return pkg.mileageRows.map((r) => ({
    id: r.id,
    date: r.date,
    origin: r.origin || '',
    destination: r.destination || '',
    purpose: r.purpose || '',
    miles: r.miles,
    rate: r.rate,
    deduction_amount: r.deductionAmount,
    is_estimate: r.isEstimate ? 'true' : 'false',
    notes: r.notes || '',
  }));
}

function buildReadmeText(pkg: TaxExportPackage): string {
  const year = pkg.metadata.taxYear;
  const warnings = pkg.scheduleC.warnings;

  return [
    `GigLedger TaxAct Tax Prep Pack (${year})`,
    '',
    `Date range: ${pkg.metadata.dateStart} to ${pkg.metadata.dateEnd}`,
    `Basis: cash`,
    `Currency: USD`,
    `Rounding: 2 decimals (amounts include cents; some tax software may round)`,
    '',
    'CONTENTS',
    '--------',
    `1. ScheduleC_Summary_${year}.csv - Line-by-line Schedule C totals (expenses shown as POSITIVE)`,
    `2. Payer_Summary_${year}.csv - Payer totals for 1099 reconciliation`,
    `3. Mileage_Summary_${year}.csv - Mileage totals for easy entry`,
    `4. Income_Detail_${year}.csv - Detailed income transactions with payer info`,
    `5. Expense_Detail_${year}.csv - Detailed expenses with asset review flags`,
    `6. Mileage_${year}.csv - Mileage log with standard deduction calculations`,
    `7. PDF_Summary_${year}.pdf - Visual summary for verification`,
    '8. This README file',
    '',
    'HOW TO USE WITH TAXACT',
    '-----------------------',
    `Step 1: Open ScheduleC_Summary_${year}.csv`,
    '   - This file contains your Schedule C line items with IRS reference numbers (N-codes)',
    '   - Use the "amount_for_entry" column - expenses are shown as POSITIVE numbers',
    '',
    'Step 2: Log into TaxAct and navigate to Business Income (Schedule C)',
    '   - TaxAct will guide you through Schedule C entry',
    '   - Use the summary CSV to enter totals for each line',
    '',
    'Step 3: IMPORTANT - Enter expenses as POSITIVE totals',
    `   - Gross receipts (N293): $${pkg.scheduleC.grossReceipts.toFixed(2)}`,
    '   - For each expense line, enter the "amount_for_entry" value as a POSITIVE number',
    '   - TaxAct expects positive expense amounts (it will subtract them automatically)',
    `   - Example: If amount_for_entry shows 2101.00 for rent, enter 2101.00 (not -2101.00)`,
    '',
    'Step 4: Use Mileage_Summary for vehicle expenses',
    `   - Total business miles: ${pkg.mileageSummary.totalBusinessMiles.toFixed(2)}`,
    `   - Standard rate: $${pkg.mileageSummary.standardRateUsed.toFixed(3)}/mile`,
    `   - Total deduction: $${pkg.mileageSummary.mileageDeductionAmount.toFixed(2)}`,
    '',
    'Step 5: Keep detail CSVs for your records',
    '   - Income_Detail has payer info for 1099 reconciliation (see Payer_Summary)',
    '   - Expense_Detail flags large purchases for asset/depreciation review',
    '   - Mileage detail log provides trip-by-trip backup',
    '   - Share these with your CPA if needed',
    '',
    'Step 6: Verify your totals',
    '   - Compare TaxAct\'s final Schedule C with the PDF summary',
    `   - Net profit should match: $${pkg.scheduleC.netProfit.toFixed(2)}`,
    '',
    'IMPORTANT DISCLAIMERS',
    '---------------------',
    '✓ This export uses CASH BASIS accounting (income when received, expenses when paid)',
    '✓ All amounts are in USD',
    '✓ Meals expenses are calculated at 50% deductible (IRS standard)',
    `✓ Mileage uses IRS standard rates for ${year}`,
    '✓ Expenses flagged for "potential_asset_review" may require depreciation treatment',
    '✓ This is NOT tax advice - verify all totals and consult a tax professional',
    '',
    `SCHEDULE C SUMMARY (${year})`,
    '-------------------------------',
    `Gross Receipts:           $${pkg.scheduleC.grossReceipts.toFixed(2)}`,
    `Returns & Allowances:     $${pkg.scheduleC.returnsAllowances.toFixed(2)}`,
    `Cost of Goods Sold:       $${pkg.scheduleC.cogs.toFixed(2)}`,
    `Other Income:             $${pkg.scheduleC.otherIncome.toFixed(2)}`,
    `Total Expenses:           $${Object.values(pkg.scheduleC.expenseTotalsByScheduleCRefNumber).reduce((sum, v) => sum + (v || 0), 0).toFixed(2)}`,
    `NET PROFIT:               $${pkg.scheduleC.netProfit.toFixed(2)}`,
    '',
    'DATA QUALITY NOTES',
    '------------------',
    `✓ Cash basis: ${pkg.metadata.basis}`,
    `✓ Currency: ${pkg.metadata.currency}`,
    `✓ Rounding: ${pkg.metadata.rounding.precision} decimal places`,
    `✓ Income transactions: ${pkg.incomeRows.length}`,
    `✓ Expense transactions: ${pkg.expenseRows.length}`,
    `✓ Mileage entries: ${pkg.mileageRows.length}`,
    `✓ Payers tracked: ${pkg.payerSummaryRows.length}`,
    '',
    warnings.length ? 'NOTES:' : '',
    ...warnings.map(w => `- ${w}`),
    '',
    'SUPPORT',
    '-------',
    'If you have questions about these exports, contact support@gigledger.com',
    'For tax filing questions, consult a licensed tax professional.',
    '',
    'Generated by GigLedger - Self-Employed Income & Tax Tracking',
    'https://gigledger.com',
  ].join('\n');
}
