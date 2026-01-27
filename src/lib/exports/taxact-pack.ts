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

  const scheduleSummaryRows = buildScheduleCSummaryRows(pkg);
  zip.file(`ScheduleC_Summary_${taxYear}.csv`, stringifyCsv(scheduleSummaryRows));

  zip.file(`Expense_Detail_${taxYear}.csv`, stringifyCsv(buildExpenseDetailRows(pkg)));
  zip.file(`Income_Detail_${taxYear}.csv`, stringifyCsv(buildIncomeDetailRows(pkg)));
  zip.file(`Mileage_${taxYear}.csv`, stringifyCsv(buildMileageRows(pkg)));

  const pdfBytes = await generateScheduleCSummaryPdf({ pkg, appVersion });
  zip.file(`PDF_Summary_${taxYear}.pdf`, pdfBytes);

  zip.file(`README_Tax_Filing_${taxYear}.txt`, buildReadmeText(pkg));

  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return { filename: `gigledger_taxact_pack_${taxYear}.zip`, bytes };
}

function buildScheduleCSummaryRows(pkg: TaxExportPackage) {
  const rows: Array<Record<string, string | number>> = [];

  const add = (label: string, ref: number, amount: number, notes: string) => {
    rows.push({
      schedule_c_label: label,
      schedule_c_ref_number: ref,
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
    payer_name: r.payerName || '',
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
    `GigLedger Tax Prep Pack (${year})`,
    '',
    `Date range: ${pkg.metadata.dateStart} to ${pkg.metadata.dateEnd}`,
    `Basis: cash`,
    `Currency: USD`,
    `Rounding: 2 decimals (amounts include cents; some tax software may round)`,
    '',
    'This export is organized for tax preparation and sharing with a tax professional. Please review all imported or entered values for accuracy.',
    '',
    'TurboTax Desktop / H&R Block Desktop TXF import (desktop-only):',
    '1) Open your tax software (desktop app)',
    '2) Use the import menu (commonly: File > Import...)',
    '3) Select the TXF file downloaded from GigLedger',
    '4) Review the imported Schedule C lines',
    '',
    'TaxAct (manual entry):',
    `- Use ScheduleC_Summary_${year}.csv to populate Schedule C worksheet fields.`,
    `- Use the detail CSVs (Income/Expense/Mileage) as supporting documentation.`,
    '',
    warnings.length ? 'Notes:' : '',
    ...warnings.map(w => `- ${w}`),
    '',
  ].join('\n');
}
