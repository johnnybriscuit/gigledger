import JSZip from 'jszip';
import type { TaxExportPackage } from './taxExportPackage';
import { stringifyCsv } from './textCsv';
import { generateScheduleCSummaryPdf } from './taxpdf';

/**
 * TurboTax Online Manual Entry Pack
 * 
 * TurboTax Online does NOT support TXF import. This pack provides:
 * - Schedule C summary CSV with manual-entry friendly amounts (positive for expenses)
 * - Payer summary CSV for CPA reconciliation
 * - Mileage summary CSV for TurboTax-friendly entry
 * - Detail CSVs for reference and CPA sharing
 * - PDF summary for verification
 * - README with step-by-step manual entry instructions
 */

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
    miles: r.miles,
    rate: r.rate,
    deduction_amount: r.deductionAmount,
    purpose: r.purpose || '',
    is_estimate: r.isEstimate,
    notes: r.notes || '',
    related_gig_id: r.relatedGigId || '',
  }));
}

function buildOtherExpensesBreakdownRows(pkg: TaxExportPackage) {
  return pkg.scheduleC.otherExpensesBreakdown.map((item) => ({
    schedule_c_ref_number: 302,
    category_name: item.name,
    raw_signed_amount: -item.amount,
    amount_for_entry: Math.abs(item.amount),
    notes: 'Supporting detail for Line 302 - enter ONLY the 302 total from ScheduleC_Summary',
  }));
}

function buildReadmeText(pkg: TaxExportPackage): string {
  const { taxYear } = pkg.metadata;
  
  return `TurboTax Online Manual Entry Pack - ${taxYear}
Generated: ${new Date(pkg.metadata.createdAt).toLocaleString()}

═══════════════════════════════════════════════════════════════════════════════
IMPORTANT: TurboTax Online does NOT support TXF file import.
This pack is designed for MANUAL ENTRY into TurboTax Online.
═══════════════════════════════════════════════════════════════════════════════

CONTENTS
--------
1. ScheduleC_Summary_${taxYear}.csv - Line-by-line Schedule C totals (expenses shown as POSITIVE)
2. Other_Expenses_Breakdown_${taxYear}.csv - Supporting detail for Line 302 (Other expenses)
3. Payer_Summary_${taxYear}.csv - Payer totals for 1099 reconciliation
4. Mileage_Summary_${taxYear}.csv - Mileage totals for TurboTax entry
5. Income_Detail_${taxYear}.csv - Detailed income transactions with payer info
6. Expense_Detail_${taxYear}.csv - Detailed expenses with asset review flags
7. Mileage_${taxYear}.csv - Mileage log with standard deduction calculations
8. PDF_Summary_${taxYear}.pdf - Visual summary for verification
9. This README file

IMPORTANT: Other_Expenses_Breakdown is supporting detail for line 302 (Other expenses).
Enter ONLY the 302 total from ScheduleC_Summary. Do NOT enter the breakdown items separately.

HOW TO USE WITH TURBOTAX ONLINE
--------------------------------
Step 1: Open ScheduleC_Summary_${taxYear}.csv
   - This file contains your Schedule C line items with IRS reference numbers (N-codes)
   - Use the "amount_for_entry" column - expenses are shown as POSITIVE numbers

Step 2: Log into TurboTax Online and navigate to Business Income (Schedule C)
   - TurboTax will ask questions about your self-employment income
   - Use the summary CSV to answer questions and enter totals

Step 3: IMPORTANT - Enter expenses as POSITIVE totals
   - Gross receipts (N293): $${pkg.scheduleC.grossReceipts.toFixed(2)}
   - For each expense line, enter the "amount_for_entry" value as a POSITIVE number
   - TurboTax expects positive expense amounts (it will subtract them automatically)
   - Example: If amount_for_entry shows 2101.00 for rent, enter 2101.00 (not -2101.00)

Step 4: Use Mileage_Summary for vehicle expenses
   - Total business miles: ${pkg.mileageSummary.totalBusinessMiles.toFixed(2)}
   - Standard rate: $${pkg.mileageSummary.standardRateUsed.toFixed(3)}/mile
   - Total deduction: $${pkg.mileageSummary.mileageDeductionAmount.toFixed(2)}

Step 5: Keep detail CSVs for your records
   - Income_Detail has payer info for 1099 reconciliation (see Payer_Summary)
   - Expense_Detail flags large purchases for asset/depreciation review
   - Mileage detail log provides trip-by-trip backup
   - Share these with your CPA if needed

Step 6: Verify your totals
   - Compare TurboTax's final Schedule C with the PDF summary
   - Net profit should match: $${pkg.scheduleC.netProfit.toFixed(2)}

IMPORTANT DISCLAIMERS
---------------------
✓ This export uses CASH BASIS accounting (income when received, expenses when paid)
✓ All amounts are in USD
✓ Meals expenses are calculated at 50% deductible (IRS standard)
✓ Mileage uses IRS standard rates for ${taxYear}
✓ Expenses flagged for "potential_asset_review" may require depreciation treatment
✓ This is NOT tax advice - verify all totals and consult a tax professional

SCHEDULE C SUMMARY (${taxYear})
-------------------------------
Gross Receipts:           $${pkg.scheduleC.grossReceipts.toFixed(2)}
Returns & Allowances:     $${pkg.scheduleC.returnsAllowances.toFixed(2)}
Cost of Goods Sold:       $${pkg.scheduleC.cogs.toFixed(2)}
Other Income:             $${pkg.scheduleC.otherIncome.toFixed(2)}
Total Expenses:           $${Object.values(pkg.scheduleC.expenseTotalsByScheduleCRefNumber).reduce((sum, v) => sum + (v || 0), 0).toFixed(2)}
NET PROFIT:               $${pkg.scheduleC.netProfit.toFixed(2)}

DATA QUALITY NOTES
------------------
✓ Cash basis: ${pkg.metadata.basis}
✓ Currency: ${pkg.metadata.currency}
✓ Rounding: ${pkg.metadata.rounding.precision} decimal places
✓ Income transactions: ${pkg.incomeRows.length}
✓ Expense transactions: ${pkg.expenseRows.length}
✓ Mileage entries: ${pkg.mileageRows.length}
✓ Payers tracked: ${pkg.payerSummaryRows.length}

SUPPORT
-------
If you have questions about these exports, contact support@bozzygigs.com
For tax filing questions, consult a licensed tax professional.

Generated by Bozzy - Self-Employed Income & Tax Tracking
https://bozzygigs.com
`;
}

export async function generateTurboTaxOnlinePack(pkg: TaxExportPackage): Promise<Uint8Array> {
  const zip = new JSZip();
  const { taxYear } = pkg.metadata;

  // Add Schedule C Summary CSV (with amount_for_entry for manual entry)
  const summaryRows = buildScheduleCSummaryRows(pkg);
  const summaryCsv = stringifyCsv(summaryRows);
  zip.file(`ScheduleC_Summary_${taxYear}.csv`, summaryCsv);

  // Add Other Expenses Breakdown CSV (supporting detail for Line 302)
  const otherExpensesRows = buildOtherExpensesBreakdownRows(pkg);
  const otherExpensesCsv = stringifyCsv(otherExpensesRows);
  zip.file(`Other_Expenses_Breakdown_${taxYear}.csv`, otherExpensesCsv);

  // Add Payer Summary CSV (for 1099 reconciliation)
  const payerSummaryRows = buildPayerSummaryRows(pkg);
  const payerSummaryCsv = stringifyCsv(payerSummaryRows);
  zip.file(`Payer_Summary_${taxYear}.csv`, payerSummaryCsv);

  // Add Mileage Summary CSV (TurboTax-friendly summary)
  const mileageSummaryRows = buildMileageSummaryRows(pkg);
  const mileageSummaryCsv = stringifyCsv(mileageSummaryRows);
  zip.file(`Mileage_Summary_${taxYear}.csv`, mileageSummaryCsv);

  // Add Income Detail CSV (with payer info)
  const incomeRows = buildIncomeDetailRows(pkg);
  const incomeCsv = stringifyCsv(incomeRows);
  zip.file(`Income_Detail_${taxYear}.csv`, incomeCsv);

  // Add Expense Detail CSV (with asset review flags)
  const expenseRows = buildExpenseDetailRows(pkg);
  const expenseCsv = stringifyCsv(expenseRows);
  zip.file(`Expense_Detail_${taxYear}.csv`, expenseCsv);

  // Add Mileage Detail CSV
  const mileageRows = buildMileageRows(pkg);
  const mileageCsv = stringifyCsv(mileageRows);
  zip.file(`Mileage_${taxYear}.csv`, mileageCsv);

  // Add PDF Summary
  const pdfBytes = await generateScheduleCSummaryPdf({ pkg, appVersion: 'Bozzy v1.0' });
  zip.file(`PDF_Summary_${taxYear}.pdf`, pdfBytes);

  // Add README
  const readmeText = buildReadmeText(pkg);
  zip.file(`README_TurboTax_Online_${taxYear}.txt`, readmeText);

  return zip.generateAsync({ type: 'uint8array' });
}
