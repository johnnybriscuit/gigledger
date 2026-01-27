import { supabase } from '../supabase';
import type { Database } from '../../types/database.types';
import type {
  TaxExportPackage,
  TaxExportCurrency,
  IncomeRow,
  ExpenseRow,
  MileageRow,
  InvoiceRow,
  SubcontractorPayoutRow,
  ReceiptsManifestItem,
  ScheduleCRefNumber,
  PayerSummaryRow,
  MileageSummary,
  ScheduleCLineItem,
} from './taxExportPackage';
import { mapCategoryToScheduleCRef } from './scheduleCRefMapping';
import { getStandardMileageRate } from './mileageRates';
import { roundCents } from './rounding';
import { getScheduleCLineName } from './scheduleCLineNames';

type GigRow = Database['public']['Tables']['gigs']['Row'];
type ExpenseDbRow = Database['public']['Tables']['expenses']['Row'];
type MileageExportRow = Database['public']['Views']['v_mileage_export']['Row'];
type InvoiceDbRow = Database['public']['Tables']['invoices']['Row'];
type InvoicePaymentRow = Database['public']['Tables']['invoice_payments']['Row'];
type SubcontractorPaymentRow = Database['public']['Tables']['gig_subcontractor_payments']['Row'];
type SubcontractorRow = Database['public']['Tables']['subcontractors']['Row'];
type PayerRow = Database['public']['Tables']['payers']['Row'];

type BuildTaxExportPackageOptions = {
  userId: string;
  taxYear: number;
  timezone: string;
  basis?: 'cash';
  dateStart?: string;
  dateEnd?: string;
  includeTips?: boolean;
  includeFeesAsDeduction?: boolean;
};

export class TaxExportError extends Error {
  code:
    | 'NOT_AUTHORIZED'
    | 'NON_USD_CURRENCY'
    | 'DATA_LOAD_FAILED'
    | 'UNSUPPORTED';

  constructor(code: TaxExportError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

function assertUsdCurrency(value: string | null | undefined) {
  if (!value) return;
  if (value !== 'USD') {
    throw new TaxExportError(
      'NON_USD_CURRENCY',
      'Tax exports currently support USD only. Please convert to USD or remove non-USD items.'
    );
  }
}

function sumScheduleCMap(map: Partial<Record<ScheduleCRefNumber, number>>): number {
  return Object.values(map).reduce((sum, v) => sum + (v || 0), 0);
}

export function buildTaxExportPackageFromData(input: {
  taxYear: number;
  timezone: string;
  dateStart: string;
  dateEnd: string;
  includeTips: boolean;
  includeFeesAsDeduction: boolean;
  gigs: GigRow[];
  expenses: ExpenseDbRow[];
  mileage: MileageExportRow[];
  invoices: InvoiceDbRow[];
  invoicePayments: Array<InvoicePaymentRow & { invoice?: Pick<InvoiceDbRow, 'id' | 'invoice_number' | 'client_name' | 'currency'> | null }>;
  subcontractorPayments: Array<SubcontractorPaymentRow & { subcontractor?: Pick<SubcontractorRow, 'id' | 'name'> | null }>;
  payers: PayerRow[];
}): TaxExportPackage {
  const createdAt = new Date().toISOString();
  const currency: TaxExportCurrency = 'USD';

  input.invoices.forEach(inv => assertUsdCurrency(inv.currency));

  // Create payer lookup map
  const payerById = new Map<string, PayerRow>(input.payers.map((p) => [p.id, p]));

  const incomeRows: IncomeRow[] = [];

  for (const gig of input.gigs) {
    const isPaid = (gig as any).paid === true;
    if (!isPaid) continue;

    const gross = (gig.gross_amount || 0) + (input.includeTips ? (gig.tips || 0) : 0) + (gig.per_diem || 0) + (gig.other_income || 0);
    const fees = gig.fees || 0;
    const netAmount = gross - fees;

    // Resolve payer information
    const payer = payerById.get(gig.payer_id);
    const payerName = payer?.name || null;
    const payerEmail = payer?.contact_email || null;
    const payerPhone = null; // Phone not in payers table yet

    // Build description from gig details (avoid placeholder "Gig")
    let description = 'Income';
    if (gig.title) {
      description = gig.title;
    } else if (gig.location) {
      description = gig.location;
    } else if (gig.notes) {
      // Use first 50 chars of notes if available
      description = gig.notes.substring(0, 50).trim();
      if (gig.notes.length > 50) description += '...';
    } else if (gig.city) {
      description = `Income — ${gig.city}`;
    }
    // Fallback is "Income" (not "Gig")

    incomeRows.push({
      id: gig.id,
      source: 'gig',
      receivedDate: gig.date,
      payerId: gig.payer_id,
      payerName,
      payerEmail,
      payerPhone,
      description,
      amount: roundCents(gross),
      fees: roundCents(fees),
      netAmount: roundCents(netAmount),
      currency,
      relatedGigId: gig.id,
    });
  }

  for (const payment of input.invoicePayments) {
    assertUsdCurrency(payment.invoice?.currency);

    incomeRows.push({
      id: payment.id,
      source: 'invoice_payment',
      receivedDate: payment.payment_date,
      payerId: null, // Invoice payments don't have payer_id
      payerName: payment.invoice?.client_name || null,
      payerEmail: null,
      payerPhone: null,
      description: payment.invoice?.invoice_number ? `Invoice Payment ${payment.invoice.invoice_number}` : 'Invoice Payment',
      amount: roundCents(payment.amount),
      fees: 0,
      netAmount: roundCents(payment.amount),
      currency,
      relatedInvoiceId: payment.invoice_id,
    });
  }

  const expenseRows: ExpenseRow[] = [];
  const receiptsManifest: ReceiptsManifestItem[] = [];

  for (const exp of input.expenses) {
    const mapping = mapCategoryToScheduleCRef(exp.category || 'Other', exp.meals_percent_allowed);
    const deductiblePct = mapping.deductiblePercent;
    const deductibleAmount = roundCents((exp.amount || 0) * deductiblePct);

    // Determine if this expense should be flagged for asset review
    const expenseAmount = exp.amount || 0;
    const category = exp.category || 'Other';
    let potentialAssetReview = false;
    let potentialAssetReason: string | null = null;

    // Flag equipment/gear for depreciation review
    if (category.toLowerCase().includes('equipment') || category.toLowerCase().includes('gear')) {
      potentialAssetReview = true;
      potentialAssetReason = 'Equipment/Gear category — review for depreciation/Section 179';
    }
    // Flag large purchases for capitalization review
    else if (expenseAmount >= 2500) {
      potentialAssetReview = true;
      potentialAssetReason = 'Amount >= $2500 — review capitalization threshold';
    }

    expenseRows.push({
      id: exp.id,
      date: exp.date,
      merchant: exp.vendor,
      description: exp.description,
      amount: roundCents(exp.amount),
      glCategory: exp.category || 'Other',
      scheduleCRefNumber: mapping.refNumber,
      deductiblePercent: deductiblePct,
      deductibleAmount,
      currency,
      receiptUrl: exp.receipt_url,
      notes: exp.notes,
      relatedGigId: exp.gig_id,
      potentialAssetReview,
      potentialAssetReason,
    });

    if (exp.receipt_url) {
      receiptsManifest.push({
        transactionId: exp.id,
        receiptUrl: exp.receipt_url,
        kind: 'expense',
      });
    }
  }

  const mileageRate = getStandardMileageRate(input.taxYear);
  const mileageRows: MileageRow[] = input.mileage.map((m) => {
    const miles = m.miles || 0;
    const deduction = typeof m.deduction_amount === 'number' ? m.deduction_amount : roundCents(miles * mileageRate);

    return {
      id: `${m.user_id || 'unknown'}:${m.date || input.dateStart}:${m.miles || 0}:${m.destination || ''}`,
      date: m.date || input.dateStart,
      origin: m.origin || null,
      destination: m.destination || null,
      purpose: m.purpose || null,
      miles,
      rate: mileageRate,
      deductionAmount: roundCents(deduction),
      currency,
      isEstimate: true,
      notes: m.notes || null,
      relatedGigId: null,
    };
  });

  const invoices: InvoiceRow[] = input.invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    clientName: inv.client_name,
    invoiceDate: inv.invoice_date,
    dueDate: inv.due_date,
    status: inv.status,
    totalAmount: roundCents(inv.total_amount),
    currency: inv.currency,
  }));

  const subcontractorPayoutRows: SubcontractorPayoutRow[] = input.subcontractorPayments.map((p) => ({
    id: p.id,
    gigId: p.gig_id,
    subcontractorId: p.subcontractor_id,
    subcontractorName: p.subcontractor?.name || null,
    amount: roundCents(p.amount),
    note: p.note,
    createdAt: p.created_at,
  }));

  const expenseTotalsByScheduleCRefNumber: Partial<Record<ScheduleCRefNumber, number>> = {};
  const otherExpensesBreakdownMap: Record<string, number> = {};
  const warnings: string[] = [];

  const grossReceipts = roundCents(incomeRows.reduce((sum, r) => sum + r.amount, 0));

  const feesTotal = roundCents(incomeRows
    .filter(r => r.source === 'gig')
    .reduce((sum, r) => sum + r.fees, 0));

  const returnsAllowances = input.includeFeesAsDeduction ? 0 : feesTotal;

  const mileageDeductionTotal = roundCents(mileageRows.reduce((sum, r) => sum + r.deductionAmount, 0));
  if (mileageDeductionTotal > 0) {
    expenseTotalsByScheduleCRefNumber[306] = mileageDeductionTotal;
    warnings.push('Car and truck expenses include a standard mileage rate deduction computed by GigLedger.');
  }

  for (const row of expenseRows) {
    if (row.scheduleCRefNumber === 302) {
      const name = `GigLedger: ${row.glCategory}`;
      otherExpensesBreakdownMap[name] = roundCents((otherExpensesBreakdownMap[name] || 0) + row.deductibleAmount);
    } else {
      expenseTotalsByScheduleCRefNumber[row.scheduleCRefNumber] = roundCents(
        (expenseTotalsByScheduleCRefNumber[row.scheduleCRefNumber] || 0) + row.deductibleAmount
      );
    }

    if (row.scheduleCRefNumber === 294 && row.deductiblePercent !== 1) {
      warnings.push('Meals and entertainment were reduced using a deductible percent (default 50%) for Schedule C totals.');
    }
  }

  if (input.includeFeesAsDeduction && feesTotal > 0) {
    expenseTotalsByScheduleCRefNumber[307] = roundCents((expenseTotalsByScheduleCRefNumber[307] || 0) + feesTotal);
  }

  const otherExpensesBreakdown = Object.entries(otherExpensesBreakdownMap)
    .filter(([, amount]) => amount !== 0)
    .map(([name, amount]) => ({ name, amount: roundCents(amount) }));

  if (otherExpensesBreakdown.length > 0) {
    expenseTotalsByScheduleCRefNumber[302] = roundCents(otherExpensesBreakdown.reduce((sum, i) => sum + i.amount, 0));
  }

  const otherIncome = 0;
  const cogs = 0;

  const expensesTotal = roundCents(sumScheduleCMap(expenseTotalsByScheduleCRefNumber));
  const netProfit = roundCents(grossReceipts - returnsAllowances - cogs - expensesTotal + otherIncome);

  // Derive payer summary rows for CPA reconciliation
  const payerSummaryMap = new Map<string, {
    payerId: string | null;
    payerName: string | null;
    payerEmail: string | null;
    payerPhone: string | null;
    paymentsCount: number;
    grossAmount: number;
    feesTotal: number;
    netAmount: number;
    dates: string[];
  }>();

  for (const row of incomeRows) {
    if (row.source !== 'gig') continue; // Only gigs have payers
    
    const key = row.payerId || 'UNKNOWN';
    const existing = payerSummaryMap.get(key);
    
    if (existing) {
      existing.paymentsCount++;
      existing.grossAmount = roundCents(existing.grossAmount + row.amount);
      existing.feesTotal = roundCents(existing.feesTotal + row.fees);
      existing.netAmount = roundCents(existing.netAmount + row.netAmount);
      existing.dates.push(row.receivedDate);
    } else {
      payerSummaryMap.set(key, {
        payerId: row.payerId || null,
        payerName: row.payerName || null,
        payerEmail: row.payerEmail || null,
        payerPhone: row.payerPhone || null,
        paymentsCount: 1,
        grossAmount: row.amount,
        feesTotal: row.fees,
        netAmount: row.netAmount,
        dates: [row.receivedDate],
      });
    }
  }

  const payerSummaryRows: PayerSummaryRow[] = Array.from(payerSummaryMap.values()).map((summary) => {
    const sortedDates = summary.dates.sort();
    const missingPayerNote = summary.payerId === null ? 'Payer missing on these transactions' : null;
    
    return {
      payerId: summary.payerId,
      payerName: summary.payerName,
      payerEmail: summary.payerEmail,
      payerPhone: summary.payerPhone,
      paymentsCount: summary.paymentsCount,
      grossAmount: summary.grossAmount,
      feesTotal: summary.feesTotal,
      netAmount: summary.netAmount,
      firstPaymentDate: sortedDates[0],
      lastPaymentDate: sortedDates[sortedDates.length - 1],
      notes: missingPayerNote,
    };
  });

  // Derive mileage summary
  const totalMiles = roundCents(mileageRows.reduce((sum, r) => sum + r.miles, 0));
  const hasAnyEstimate = mileageRows.some(r => r.isEstimate);
  const mileageSummary: MileageSummary = {
    taxYear: input.taxYear,
    totalBusinessMiles: totalMiles,
    standardRateUsed: mileageRate,
    mileageDeductionAmount: mileageDeductionTotal,
    entriesCount: mileageRows.length,
    isEstimateAny: hasAnyEstimate,
    notes: 'Vehicle info not collected; keep your odometer records. Standard mileage rate applied.',
  };

  // Build Schedule C line items with manual-entry friendly amounts
  const scheduleCLineItems: ScheduleCLineItem[] = [];

  // Income lines (positive amounts)
  scheduleCLineItems.push({
    scheduleCRefNumber: 293,
    scheduleCLineName: getScheduleCLineName(293),
    lineDescription: 'Gross receipts or sales',
    rawSignedAmount: grossReceipts,
    amountForEntry: grossReceipts,
    notes: null,
  });

  if (returnsAllowances !== 0) {
    scheduleCLineItems.push({
      scheduleCRefNumber: 296,
      scheduleCLineName: getScheduleCLineName(296),
      lineDescription: 'Returns and allowances',
      rawSignedAmount: returnsAllowances,
      amountForEntry: returnsAllowances,
      notes: null,
    });
  }

  if (cogs !== 0) {
    scheduleCLineItems.push({
      scheduleCRefNumber: 295,
      scheduleCLineName: getScheduleCLineName(295),
      lineDescription: 'Cost of goods sold',
      rawSignedAmount: cogs,
      amountForEntry: cogs,
      notes: null,
    });
  }

  if (otherIncome !== 0) {
    scheduleCLineItems.push({
      scheduleCRefNumber: 304,
      scheduleCLineName: getScheduleCLineName(304),
      lineDescription: 'Other income',
      rawSignedAmount: otherIncome,
      amountForEntry: otherIncome,
      notes: null,
    });
  }

  // Expense lines (show as positive for manual entry)
  for (const [refNum, amount] of Object.entries(expenseTotalsByScheduleCRefNumber)) {
    const refNumber = parseInt(refNum) as ScheduleCRefNumber;
    if (amount === 0) continue;

    // For expenses, raw amount is stored as positive internally,
    // but conceptually it reduces income, so we provide positive amount_for_entry
    scheduleCLineItems.push({
      scheduleCRefNumber: refNumber,
      scheduleCLineName: getScheduleCLineName(refNumber),
      lineDescription: getScheduleCLineName(refNumber),
      rawSignedAmount: -amount, // Negative to show it reduces income
      amountForEntry: Math.abs(amount), // Positive for manual entry
      notes: refNumber === 302 ? 'See itemized breakdown in Other Expenses' : null,
    });
  }

  // Add itemized other expenses as separate line items
  for (const item of otherExpensesBreakdown) {
    scheduleCLineItems.push({
      scheduleCRefNumber: 302,
      scheduleCLineName: getScheduleCLineName(302),
      lineDescription: item.name,
      rawSignedAmount: -item.amount,
      amountForEntry: Math.abs(item.amount),
      notes: 'Part of Line 302 (Other expenses)',
    });
  }

  return {
    metadata: {
      taxYear: input.taxYear,
      dateStart: input.dateStart,
      dateEnd: input.dateEnd,
      createdAt,
      timezone: input.timezone,
      basis: 'cash',
      currency,
      rounding: { mode: 'half_away_from_zero', precision: 2 },
      schemaVersion: '2026-01-26.1',
    },
    scheduleC: {
      grossReceipts,
      returnsAllowances,
      cogs,
      otherIncome,
      expenseTotalsByScheduleCRefNumber,
      otherExpensesBreakdown,
      netProfit,
      warnings,
    },
    scheduleCLineItems,
    incomeRows,
    expenseRows,
    mileageRows,
    invoiceRows: invoices,
    subcontractorPayoutRows,
    receiptsManifest,
    payerSummaryRows,
    mileageSummary,
  };
}

export async function buildTaxExportPackage(options: BuildTaxExportPackageOptions): Promise<TaxExportPackage> {
  const basis = options.basis ?? 'cash';
  if (basis !== 'cash') {
    throw new TaxExportError('UNSUPPORTED', 'Only cash basis exports are supported.');
  }

  const dateStart = options.dateStart ?? `${options.taxYear}-01-01`;
  const dateEnd = options.dateEnd ?? `${options.taxYear}-12-31`;
  const includeTips = options.includeTips ?? true;
  const includeFeesAsDeduction = options.includeFeesAsDeduction ?? true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== options.userId) {
    throw new TaxExportError('NOT_AUTHORIZED', 'Not authorized to export this data.');
  }

  const [gigsRes, expRes, mileageRes, invoicesRes, invoicePaymentsRes, subcontractorPaymentsRes, payersRes] = await Promise.all([
    supabase
      .from('gigs')
      .select('*')
      .eq('user_id', options.userId)
      .gte('date', dateStart)
      .lte('date', dateEnd),
    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', options.userId)
      .gte('date', dateStart)
      .lte('date', dateEnd),
    supabase
      .from('v_mileage_export')
      .select('*')
      .eq('user_id', options.userId)
      .gte('date', dateStart)
      .lte('date', dateEnd),
    supabase
      .from('invoices' as any)
      .select('*')
      .eq('user_id', options.userId)
      .gte('invoice_date', dateStart)
      .lte('invoice_date', dateEnd),
    supabase
      .from('invoice_payments')
      .select('*')
      .gte('payment_date', dateStart)
      .lte('payment_date', dateEnd),
    supabase
      .from('gig_subcontractor_payments')
      .select('*, subcontractor:subcontractors(id, name), gig:gigs!inner(date)')
      .eq('user_id', options.userId)
      .gte('gig.date', dateStart)
      .lte('gig.date', dateEnd),
    supabase
      .from('payers')
      .select('*')
      .eq('user_id', options.userId),
  ]);

  if (gigsRes.error || expRes.error || mileageRes.error || invoicesRes.error || invoicePaymentsRes.error || subcontractorPaymentsRes.error || payersRes.error) {
    throw new TaxExportError('DATA_LOAD_FAILED', 'Failed to load export data. Please try again.');
  }

  const gigs = (gigsRes.data || []) as GigRow[];
  const expenses = (expRes.data || []) as ExpenseDbRow[];
  const mileage = (mileageRes.data || []) as MileageExportRow[];
  const invoices = ((invoicesRes.data || []) as unknown) as InvoiceDbRow[];

  for (const inv of invoices) assertUsdCurrency(inv.currency);

  const invoiceById = new Map<string, InvoiceDbRow>(invoices.map((i) => [i.id, i]));
  const invoicePaymentsAll = (invoicePaymentsRes.data || []) as InvoicePaymentRow[];
  const invoicePayments = invoicePaymentsAll
    .filter((p) => invoiceById.has(p.invoice_id))
    .map((p) => {
      const inv = invoiceById.get(p.invoice_id);
      assertUsdCurrency(inv?.currency);

      return {
        ...p,
        invoice: inv
          ? {
              id: inv.id,
              invoice_number: inv.invoice_number,
              client_name: inv.client_name,
              currency: inv.currency,
            }
          : null,
      } as InvoicePaymentRow & {
        invoice?: Pick<InvoiceDbRow, 'id' | 'invoice_number' | 'client_name' | 'currency'> | null;
      };
    });

  const subcontractorPayments = (subcontractorPaymentsRes.data || []) as any[];
  const payers = (payersRes.data || []) as PayerRow[];

  return buildTaxExportPackageFromData({
    taxYear: options.taxYear,
    timezone: options.timezone,
    dateStart,
    dateEnd,
    includeTips,
    includeFeesAsDeduction,
    gigs,
    expenses,
    mileage,
    invoices,
    invoicePayments,
    subcontractorPayments,
    payers,
  });
}
