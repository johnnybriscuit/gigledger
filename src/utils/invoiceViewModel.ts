import { Invoice, formatCurrency, InvoiceSettings } from '../types/invoice';
import { PaymentMethodDetail } from '../hooks/usePaymentMethodDetails';
import { PaymentMethodDisplay } from '../types/paymentMethods';
import { formatPaymentMethodsForDisplay } from './formatPaymentMethods';
import { getPaymentMethodsConfig } from './paymentMethodsMigration';
import { calculateInvoiceTotals, calculateLineItemAmount } from './invoiceCalculations';

/**
 * Computed line item with guaranteed correct amount calculation
 */
export interface ComputedLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number; // Always computed as qty * rate
}

/**
 * Payment method with resolved details
 * @deprecated Use PaymentMethodDisplay from formatPaymentMethods instead
 */
export interface ResolvedPaymentMethod {
  method: string;
  displayText: string; // e.g., "Venmo: @johnnybriscuit" or "Venmo (add handle in Account → Payment Methods)"
}

/**
 * Invoice View Model - single source of truth for rendering
 * Used by both in-app preview and HTML/PDF export
 */
export interface InvoiceViewModel {
  // Original invoice data
  invoice: Invoice;
  
  // Computed line items with correct math
  lineItems: ComputedLineItem[];
  
  // Computed totals
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalDue: number;
  
  // Resolved payment methods with details (legacy)
  paymentMethods: ResolvedPaymentMethod[];
  
  // New structured payment method displays
  paymentMethodDisplays: PaymentMethodDisplay[];
}

/**
 * Build invoice view model with deterministic calculations
 */
export function buildInvoiceViewModel(
  invoice: Invoice,
  paymentMethodDetails?: PaymentMethodDetail[],
  settings?: InvoiceSettings
): InvoiceViewModel {
  // Compute line items with correct math
  const lineItems: ComputedLineItem[] = (invoice.line_items || []).map((item) => {
    const qty = Number(item.quantity ?? 0);
    const rate = Number(item.rate ?? 0);
    const amount = calculateLineItemAmount(qty, rate);
    
    return {
      id: item.id,
      description: item.description,
      quantity: qty,
      rate: rate,
      amount: amount,
    };
  });
  
  // Compute subtotal from line items
  const totals = calculateInvoiceTotals(lineItems, invoice.tax_rate, invoice.discount_amount);
  const subtotal = totals.subtotal;
  const taxAmount = totals.taxAmount;
  const discountAmount = totals.discountAmount;
  const totalDue = totals.totalAmount;
  
  // Resolve payment methods with details (legacy support)
  const paymentMethods: ResolvedPaymentMethod[] = (invoice.accepted_payment_methods || []).map((pm) => {
    const methodKey = pm.method.toLowerCase().replace(/\s+/g, '');
    const detail = paymentMethodDetails?.find(pmd => pmd.method === methodKey);
    
    let displayText: string = pm.method;
    
    // If we have payment method details from settings
    if (detail?.enabled && detail?.details?.trim()) {
      displayText = `${pm.method}: ${detail.details}`;
    }
    // If the invoice has stored details (snapshot at creation)
    else if (pm.details?.trim()) {
      displayText = `${pm.method}: ${pm.details}`;
    }
    // No details available
    else {
      displayText = `${pm.method} (add handle in Account → Payment Methods)`;
    }
    
    return {
      method: pm.method,
      displayText,
    };
  });
  
  // New structured payment method displays
  let paymentMethodDisplays: PaymentMethodDisplay[] = [];
  const hasInvoicePaymentSnapshot = (invoice.accepted_payment_methods || []).some((pm) => pm.details?.trim());

  if (hasInvoicePaymentSnapshot && paymentMethods.length > 0) {
    paymentMethodDisplays = paymentMethods.map(pm => ({
      label: pm.method,
      details: pm.displayText.includes(':')
        ? pm.displayText.split(':').slice(1).join(':').trim()
        : pm.displayText,
    }));
  } else if (settings) {
    // Try to get payment methods config from settings
    const config = getPaymentMethodsConfig(settings);
    if (config && config.methods.length > 0) {
      paymentMethodDisplays = formatPaymentMethodsForDisplay(
        config,
        invoice.invoice_number
      );
    }
  }
  
  // Fallback to legacy format if no new config available
  if (paymentMethodDisplays.length === 0 && paymentMethods.length > 0) {
    paymentMethodDisplays = paymentMethods.map(pm => ({
      label: pm.method,
      details: pm.displayText.includes(':') 
        ? pm.displayText.split(':').slice(1).join(':').trim()
        : pm.displayText,
    }));
  }
  
  return {
    invoice,
    lineItems,
    subtotal,
    taxAmount,
    discountAmount,
    totalDue,
    paymentMethods, // Keep for backward compatibility
    paymentMethodDisplays, // New structured displays
  };
}

/**
 * Format line item for display
 */
export function formatLineItemAmount(item: ComputedLineItem, currency: string = 'USD'): string {
  return formatCurrency(item.amount, currency);
}

/**
 * Format line item rate for display
 */
export function formatLineItemRate(item: ComputedLineItem, currency: string = 'USD'): string {
  return formatCurrency(item.rate, currency);
}
