/**
 * Payment Methods Display Formatter
 * 
 * Shared utility for formatting payment methods for display in both:
 * 1. Invoice Settings UI preview
 * 2. Invoice HTML rendering
 */

import { 
  PaymentMethodsConfig, 
  PaymentMethodDisplay 
} from '../types/paymentMethods';

const SUPPORT_EMAIL = 'support@bozzygigs.com';

/**
 * Formats payment methods configuration into display-ready strings
 * 
 * @param config - Payment methods configuration
 * @param invoiceNumber - Invoice number for default notes/memos
 * @param supportEmail - Support email for wire transfer fallback
 * @returns Array of formatted payment method displays
 */
export function formatPaymentMethodsForDisplay(
  config: PaymentMethodsConfig | null | undefined,
  invoiceNumber?: string,
  supportEmail: string = SUPPORT_EMAIL
): PaymentMethodDisplay[] {
  if (!config || !config.methods || config.methods.length === 0) {
    return [];
  }

  const displays: PaymentMethodDisplay[] = [];
  const defaultNote = invoiceNumber ? `Invoice #${invoiceNumber}` : 'Invoice payment';

  for (const method of config.methods) {
    if (!method.enabled) continue;

    switch (method.type) {
      case 'cash':
        displays.push({
          label: 'Cash',
          details: method.instructions || 'Cash accepted in person.',
        });
        break;

      case 'check':
        {
          const parts: string[] = [`Check payable to: ${method.payableTo}`];
          
          if (method.memo) {
            parts.push(`Memo: ${method.memo}`);
          } else if (invoiceNumber) {
            parts.push(`Memo: Invoice #${invoiceNumber}`);
          }
          
          if (method.mailingAddress) {
            parts.push(`Mail to: ${method.mailingAddress}`);
          }
          
          displays.push({
            label: 'Check',
            details: parts.join(' • '),
          });
        }
        break;

      case 'venmo':
        {
          const note = method.note || defaultNote;
          displays.push({
            label: 'Venmo',
            details: `${method.handle} • Note: ${note}`,
          });
        }
        break;

      case 'zelle':
        {
          const note = method.note || defaultNote;
          displays.push({
            label: 'Zelle',
            details: `${method.contact} • Note: ${note}`,
          });
        }
        break;

      case 'paypal':
        {
          const note = method.note || defaultNote;
          displays.push({
            label: 'PayPal',
            details: `${method.contact} • Note: ${note}`,
          });
        }
        break;

      case 'cashapp':
        {
          const note = method.note || defaultNote;
          displays.push({
            label: 'Cash App',
            details: `${method.cashtag} • Note: ${note}`,
          });
        }
        break;

      case 'wire':
        {
          if (method.includeBankDetailsOnInvoice && (
            method.accountHolder || 
            method.bankName || 
            method.routingNumber || 
            method.accountNumber
          )) {
            // Show bank details
            const parts: string[] = [];
            
            if (method.accountHolder) {
              parts.push(`Account Holder: ${method.accountHolder}`);
            }
            if (method.bankName) {
              parts.push(`Bank: ${method.bankName}`);
            }
            if (method.routingNumber) {
              parts.push(`Routing: ${method.routingNumber}`);
            }
            if (method.accountNumber) {
              // Mask account number for security (show last 4 digits)
              const masked = method.accountNumber.length > 4
                ? '****' + method.accountNumber.slice(-4)
                : method.accountNumber;
              parts.push(`Account: ${masked}`);
            }
            if (method.swift) {
              parts.push(`SWIFT: ${method.swift}`);
            }
            if (method.reference) {
              parts.push(`Reference: ${method.reference}`);
            } else if (invoiceNumber) {
              parts.push(`Reference: Invoice #${invoiceNumber}`);
            }
            
            displays.push({
              label: 'Wire Transfer',
              details: parts.join(' • '),
            });
          } else {
            // Show instructions or fallback
            const details = method.instructions 
              || `Wire transfer: contact ${supportEmail} for instructions.`;
            
            displays.push({
              label: 'Wire Transfer',
              details,
            });
          }
        }
        break;

      case 'card':
        {
          const parts: string[] = [`Pay here: ${method.paymentUrl}`];
          
          if (method.acceptedCards) {
            parts.push(`Accepted: ${method.acceptedCards}`);
          }
          
          if (method.note) {
            parts.push(method.note);
          }
          
          displays.push({
            label: 'Credit/Debit Card',
            details: parts.join(' • '),
          });
        }
        break;
    }
  }

  return displays;
}

/**
 * Formats payment methods as plain text (for email, etc.)
 */
export function formatPaymentMethodsAsText(
  config: PaymentMethodsConfig | null | undefined,
  invoiceNumber?: string,
  supportEmail: string = SUPPORT_EMAIL
): string {
  const displays = formatPaymentMethodsForDisplay(config, invoiceNumber, supportEmail);
  
  if (displays.length === 0) {
    return 'No payment methods configured.';
  }
  
  return displays
    .map(d => `${d.label}: ${d.details}`)
    .join('\n');
}

/**
 * Gets a summary count of enabled payment methods
 */
export function getEnabledPaymentMethodsCount(
  config: PaymentMethodsConfig | null | undefined
): number {
  if (!config || !config.methods) return 0;
  return config.methods.filter(m => m.enabled).length;
}
