import JSZip from 'jszip';
import type { TaxExportPackage } from './taxExportPackage';
import { stringifyCsv } from './textCsv';
import { generateScheduleCSummaryPdf } from './taxpdf';

/**
 * TurboTax Online Manual Entry Pack
 * 
 * TurboTax Online does NOT support TXF import. This pack provides:
 * - Schedule C summary CSV for manual entry
 * - Detail CSVs for reference and CPA sharing
 * - PDF summary for verification
 * - README with step-by-step manual entry instructions
 */

function buildScheduleCSummaryRows(pkg: TaxExportPackage) {
  const rows: Array<{
    line_description: string;
    schedule_c_ref_number: number;
    amount: number;
    notes: string;
  }> = [];

  const add = (
    line_description: string,
    schedule_c_ref_number: number,
    amount: number,
    notes: string
  ) => {
    rows.push({
      line_description,
      schedule_c_ref_number,
      amount,
      notes,
    });
  };

  add('Gross receipts', 293, pkg.scheduleC.grossReceipts, 'Cash basis. Money received only.');
  add('Returns and allowances', 296, -Math.abs(pkg.scheduleC.returnsAllowances), 'Negative amount.');
  add('Cost of goods sold', 295, -Math.abs(pkg.scheduleC.cogs), 'Negative amount.');

  for (const [key, value] of Object.entries(pkg.scheduleC.expenseTotalsByScheduleCRefNumber)) {
    const ref = Number(key);
    if (ref === 293 || ref === 296 || ref === 295 || ref === 303 || ref === 302) continue;
    add(`Expense (N${ref})`, ref, -Math.abs(value || 0), 'Negative amount.');
  }

  for (const item of pkg.scheduleC.otherExpensesBreakdown) {
    add(item.name, 302, -Math.abs(item.amount), 'Other expense line item. Negative amount.');
  }

  if (pkg.scheduleC.otherIncome) {
    add('Other business income', 303, Math.abs(pkg.scheduleC.otherIncome), 'Positive amount.');
  }

  return rows;
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
    description: r.description,
    amount: r.amount,
    fees: r.fees,
    net_amount: r.netAmount,
    related_invoice_id: r.relatedInvoiceId || '',
    related_gig_id: r.relatedGigId || '',
  }));
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
1. ScheduleC_Summary_${taxYear}.csv - Line-by-line Schedule C totals with reference numbers
2. Income_Detail_${taxYear}.csv - Detailed income transactions
3. Expense_Detail_${taxYear}.csv - Detailed expense transactions
4. Mileage_${taxYear}.csv - Mileage log with standard deduction calculations
5. PDF_Summary_${taxYear}.pdf - Visual summary for verification
6. This README file

HOW TO USE WITH TURBOTAX ONLINE
--------------------------------
Step 1: Open ScheduleC_Summary_${taxYear}.csv
   - This file contains your Schedule C line items with IRS reference numbers (N-codes)
   - Each row shows: line description, reference number, amount, and notes

Step 2: Log into TurboTax Online and navigate to Business Income (Schedule C)
   - TurboTax will ask questions about your self-employment income
   - Use the summary CSV to answer questions and enter totals

Step 3: Enter totals manually
   - Gross receipts (N293): $${pkg.scheduleC.grossReceipts.toFixed(2)}
   - Enter each expense category total from the summary CSV
   - TurboTax will guide you through the Schedule C form

Step 4: Keep detail CSVs for your records
   - Income_Detail, Expense_Detail, and Mileage CSVs provide transaction-level backup
   - Share these with your CPA if needed
   - Keep for audit support

Step 5: Verify your totals
   - Compare TurboTax's final Schedule C with the PDF summary
   - Net profit should match: $${pkg.scheduleC.netProfit.toFixed(2)}

IMPORTANT DISCLAIMERS
---------------------
✓ This export uses CASH BASIS accounting (income when received, expenses when paid)
✓ All amounts are in USD
✓ Meals expenses are calculated at ${pkg.expenseRows.find(e => e.glCategory === 'Meals')?.deductiblePercent || 50}% deductible
✓ Mileage uses IRS standard rates for ${taxYear}
✓ This is NOT tax advice - verify all totals and consult a tax professional

SCHEDULE C SUMMARY (${taxYear})
-------------------------------
Gross Receipts:           $${pkg.scheduleC.grossReceipts.toFixed(2)}
Returns & Allowances:     $${pkg.scheduleC.returnsAllowances.toFixed(2)}
Cost of Goods Sold:       $${pkg.scheduleC.cogs.toFixed(2)}
Other Income:             $${pkg.scheduleC.otherIncome.toFixed(2)}
Total Expenses:           $${Object.values(pkg.scheduleC.expenseTotalsByScheduleCRefNumber).reduce((sum, v) => sum + (v || 0), 0).toFixed(2)}
NET PROFIT:               $${pkg.scheduleC.netProfit.toFixed(2)}

SUPPORT
-------
If you have questions about these exports, contact support@gigledger.com
For tax filing questions, consult a licensed tax professional.

Generated by GigLedger - Self-Employed Income & Tax Tracking
https://gigledger.com
`;
}

export async function generateTurboTaxOnlinePack(pkg: TaxExportPackage): Promise<Uint8Array> {
  const zip = new JSZip();
  const { taxYear } = pkg.metadata;

  // Add Schedule C Summary CSV
  const summaryRows = buildScheduleCSummaryRows(pkg);
  const summaryCsv = stringifyCsv(summaryRows);
  zip.file(`ScheduleC_Summary_${taxYear}.csv`, summaryCsv);

  // Add Income Detail CSV
  const incomeRows = buildIncomeDetailRows(pkg);
  const incomeCsv = stringifyCsv(incomeRows);
  zip.file(`Income_Detail_${taxYear}.csv`, incomeCsv);

  // Add Expense Detail CSV
  const expenseRows = buildExpenseDetailRows(pkg);
  const expenseCsv = stringifyCsv(expenseRows);
  zip.file(`Expense_Detail_${taxYear}.csv`, expenseCsv);

  // Add Mileage CSV
  const mileageRows = buildMileageRows(pkg);
  const mileageCsv = stringifyCsv(mileageRows);
  zip.file(`Mileage_${taxYear}.csv`, mileageCsv);

  // Add PDF Summary
  const pdfBytes = await generateScheduleCSummaryPdf({ pkg, appVersion: 'GigLedger v1.0' });
  zip.file(`PDF_Summary_${taxYear}.pdf`, pdfBytes);

  // Add README
  const readmeText = buildReadmeText(pkg);
  zip.file(`README_TurboTax_Online_${taxYear}.txt`, readmeText);

  return zip.generateAsync({ type: 'uint8array' });
}
