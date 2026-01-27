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
} from './taxExportPackage';
import { mapCategoryToScheduleCRef } from './scheduleCRefMapping';
import { getStandardMileageRate } from './mileageRates';
import { roundCents } from './rounding';

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

    // Build description from gig details
    let description = 'Income';
    if (gig.title) {
      description = gig.title;
    } else if (gig.location || gig.city) {
      const parts = ['Gig'];
      if (gig.location) parts.push(gig.location);
      if (gig.city) parts.push(gig.city);
      description = parts.join(' — ');
    } else {
      description = 'Gig';
    }

    incomeRows.push({
      id: gig.id,
      source: 'gig',
      receivedDate: gig.date,
      payerId: gig.payer_id,
      payerName,
      payerEmail,
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
      payerName: payment.invoice?.client_name || null,
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
    incomeRows,
    expenseRows,
    mileageRows,
    invoiceRows: invoices,
    subcontractorPayoutRows,
    receiptsManifest,
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
