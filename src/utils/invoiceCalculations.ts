import { roundCents } from '../lib/exports/rounding';
import { getToday, isBeforeDay, parseStoredDate } from '../lib/date';
import { Invoice, InvoiceStatus } from '../types/invoice';

type InvoiceLike = Pick<Invoice, 'status' | 'due_date' | 'total_amount'> & {
  balance_due?: number;
  total_paid?: number;
};

export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}

export function roundCurrencyAmount(value: number | null | undefined): number {
  return roundCents(Number(value ?? 0));
}

export function calculateLineItemAmount(quantity: number, rate: number): number {
  return roundCurrencyAmount(Number(quantity ?? 0) * Number(rate ?? 0));
}

export function calculateInvoiceTotals(
  lineItems: Array<{ quantity: number; rate: number }>,
  taxRate?: number | null,
  discountAmount?: number | null
): InvoiceTotals {
  const subtotal = roundCurrencyAmount(
    lineItems.reduce((sum, item) => sum + calculateLineItemAmount(item.quantity, item.rate), 0)
  );
  const normalizedTaxRate = Number(taxRate ?? 0);
  const taxAmount = normalizedTaxRate > 0
    ? roundCurrencyAmount(subtotal * (normalizedTaxRate / 100))
    : 0;
  const normalizedDiscount = roundCurrencyAmount(discountAmount ?? 0);

  return {
    subtotal,
    taxAmount,
    discountAmount: normalizedDiscount,
    totalAmount: roundCurrencyAmount(subtotal + taxAmount - normalizedDiscount),
  };
}

export function getInvoiceBalanceDue(invoice: InvoiceLike): number {
  if (typeof invoice.balance_due === 'number') {
    return roundCurrencyAmount(invoice.balance_due);
  }

  return roundCurrencyAmount(invoice.total_amount - Number(invoice.total_paid ?? 0));
}

export function getEffectiveInvoiceStatus(invoice: InvoiceLike): InvoiceStatus {
  if (invoice.status === 'paid' || invoice.status === 'cancelled' || invoice.status === 'draft') {
    return invoice.status;
  }

  if (getInvoiceBalanceDue(invoice) <= 0) {
    return 'paid';
  }

  if (
    ['sent', 'viewed', 'partially_paid', 'overdue'].includes(invoice.status) &&
    isBeforeDay(parseStoredDate(invoice.due_date), getToday())
  ) {
    return 'overdue';
  }

  return invoice.status;
}
