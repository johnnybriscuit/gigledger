/**
 * Payment Methods Migration Utilities
 * 
 * Handles backward compatibility between old PaymentMethodDetail[] format
 * and new structured PaymentMethodsConfig format.
 */

import { PaymentMethodDetail } from '../types/invoice';
import { 
  PaymentMethodsConfig, 
  PaymentMethodConfig,
  PaymentMethodType 
} from '../types/paymentMethods';
import { formatPaymentMethodsForDisplay } from './formatPaymentMethods';

/**
 * Maps old payment method names to new type identifiers
 */
const OLD_TO_NEW_TYPE_MAP: Record<string, PaymentMethodType> = {
  'Cash': 'cash',
  'Check': 'check',
  'Venmo': 'venmo',
  'Zelle': 'zelle',
  'PayPal': 'paypal',
  'Cash App': 'cashapp',
  'Wire Transfer': 'wire',
  'Credit Card': 'card',
};

const NEW_TO_OLD_TYPE_MAP: Record<PaymentMethodType, PaymentMethodDetail['method']> = {
  cash: 'Cash',
  check: 'Check',
  venmo: 'Venmo',
  zelle: 'Zelle',
  paypal: 'PayPal',
  cashapp: 'Cash App',
  wire: 'Wire Transfer',
  card: 'Credit Card',
};

/**
 * Detects if a string looks like a Venmo handle
 */
function looksLikeVenmoHandle(str: string): boolean {
  return str.trim().startsWith('@');
}

/**
 * Detects if a string looks like an email
 */
function looksLikeEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

/**
 * Detects if a string looks like a phone number
 */
function looksLikePhone(str: string): boolean {
  return /^[\d\s\-\(\)]+$/.test(str.trim()) && str.replace(/\D/g, '').length >= 10;
}

/**
 * Detects if a string looks like a Cash App cashtag
 */
function looksLikeCashtag(str: string): boolean {
  return str.trim().startsWith('$');
}

/**
 * Detects if a string looks like a URL
 */
function looksLikeUrl(str: string): boolean {
  return /^https?:\/\//i.test(str.trim()) || str.includes('paypal.me');
}

/**
 * Migrates old payment method details to new structured config
 * 
 * @param oldMethods - Array of old PaymentMethodDetail objects
 * @returns New structured PaymentMethodsConfig
 */
export function migrateOldPaymentMethods(
  oldMethods: PaymentMethodDetail[]
): PaymentMethodsConfig {
  const methods: PaymentMethodConfig[] = [];

  for (const oldMethod of oldMethods) {
    const type = OLD_TO_NEW_TYPE_MAP[oldMethod.method];
    if (!type) continue; // Skip unknown methods

    const details = oldMethod.details?.trim() || '';

    switch (type) {
      case 'cash':
        methods.push({
          type: 'cash',
          enabled: true,
          instructions: details || undefined,
        });
        break;

      case 'check':
        methods.push({
          type: 'check',
          enabled: true,
          payableTo: details || 'Please specify',
          memo: undefined,
          mailingAddress: undefined,
        });
        break;

      case 'venmo':
        if (looksLikeVenmoHandle(details)) {
          methods.push({
            type: 'venmo',
            enabled: true,
            handle: details,
            note: undefined,
          });
        } else {
          methods.push({
            type: 'venmo',
            enabled: true,
            handle: details || '@yourhandle',
            note: undefined,
          });
        }
        break;

      case 'zelle':
        if (looksLikeEmail(details) || looksLikePhone(details)) {
          methods.push({
            type: 'zelle',
            enabled: true,
            contact: details,
            note: undefined,
          });
        } else {
          methods.push({
            type: 'zelle',
            enabled: true,
            contact: details || 'email@example.com',
            note: undefined,
          });
        }
        break;

      case 'paypal':
        if (looksLikeEmail(details) || looksLikeUrl(details)) {
          methods.push({
            type: 'paypal',
            enabled: true,
            contact: details,
            note: undefined,
          });
        } else {
          methods.push({
            type: 'paypal',
            enabled: true,
            contact: details || 'email@example.com',
            note: undefined,
          });
        }
        break;

      case 'cashapp':
        if (looksLikeCashtag(details)) {
          methods.push({
            type: 'cashapp',
            enabled: true,
            cashtag: details,
            note: undefined,
          });
        } else {
          methods.push({
            type: 'cashapp',
            enabled: true,
            cashtag: details || '$yourcashtag',
            note: undefined,
          });
        }
        break;

      case 'wire':
        methods.push({
          type: 'wire',
          enabled: true,
          instructions: details || undefined,
          includeBankDetailsOnInvoice: false,
        });
        break;

      case 'card':
        if (looksLikeUrl(details)) {
          methods.push({
            type: 'card',
            enabled: true,
            paymentUrl: details,
            note: undefined,
            acceptedCards: undefined,
          });
        } else {
          methods.push({
            type: 'card',
            enabled: true,
            paymentUrl: details || 'https://payment-link.com',
            note: undefined,
            acceptedCards: undefined,
          });
        }
        break;
    }
  }

  return {
    enabled: methods.length > 0,
    methods,
  };
}

/**
 * Gets payment methods config, migrating from old format if needed
 * 
 * @param settings - Invoice settings object
 * @returns Structured payment methods config
 */
export function getPaymentMethodsConfig(
  settings: { 
    payment_methods_config?: any; 
    accepted_payment_methods?: PaymentMethodDetail[] 
  }
): PaymentMethodsConfig {
  // If new config exists, use it
  if (settings.payment_methods_config) {
    return settings.payment_methods_config as PaymentMethodsConfig;
  }

  // Otherwise, migrate from old format
  if (settings.accepted_payment_methods && settings.accepted_payment_methods.length > 0) {
    return migrateOldPaymentMethods(settings.accepted_payment_methods);
  }

  // No payment methods configured
  return {
    enabled: false,
    methods: [],
  };
}

export function snapshotAcceptedPaymentMethods(
  config: PaymentMethodsConfig | null | undefined,
  invoiceNumber?: string,
  selectedMethods?: PaymentMethodDetail[] | null
): PaymentMethodDetail[] {
  const selectedSet = new Set((selectedMethods || []).map((method) => method.method));
  const selectedLookup = new Map((selectedMethods || []).map((method) => [method.method, method]));

  const configLookup = new Map(
    (config?.methods || [])
      .filter((method) => method.enabled)
      .map((method) => [NEW_TO_OLD_TYPE_MAP[method.type], method] as const)
  );

  const orderedMethods: PaymentMethodDetail['method'][] = [];
  for (const method of selectedMethods || []) {
    if (!orderedMethods.includes(method.method)) {
      orderedMethods.push(method.method);
    }
  }
  for (const method of configLookup.keys()) {
    if (!selectedSet.size || selectedSet.has(method)) {
      orderedMethods.push(method);
    }
  }

  const uniqueMethods = orderedMethods.filter((method, index) => orderedMethods.indexOf(method) === index);
  const displays = formatPaymentMethodsForDisplay(config, invoiceNumber);

  const detailsByMethod = new Map<PaymentMethodDetail['method'], string>();
  for (const method of config?.methods || []) {
    if (!method.enabled) continue;
    const legacyMethod = NEW_TO_OLD_TYPE_MAP[method.type];
    const display = displays.find((item) => item.label === legacyMethod || normalizeMethodLabel(item.label) === legacyMethod);
    if (display?.details) {
      detailsByMethod.set(legacyMethod, display.details);
    }
  }

  return uniqueMethods.map((method) => ({
    method,
    details: detailsByMethod.get(method) ?? selectedLookup.get(method)?.details ?? '',
  }));
}

/**
 * Validates that all required fields are present for enabled methods
 * 
 * @param config - Payment methods configuration
 * @returns Array of validation errors (empty if valid)
 */
export function validatePaymentMethodsConfig(
  config: PaymentMethodsConfig
): Array<{ type: PaymentMethodType; field: string; message: string }> {
  const errors: Array<{ type: PaymentMethodType; field: string; message: string }> = [];

  for (const method of config.methods) {
    if (!method.enabled) continue;

    switch (method.type) {
      case 'check':
        if (!method.payableTo?.trim()) {
          errors.push({
            type: 'check',
            field: 'payableTo',
            message: 'Payable to is required for checks',
          });
        }
        break;

      case 'venmo':
        if (!method.handle?.trim()) {
          errors.push({
            type: 'venmo',
            field: 'handle',
            message: 'Venmo handle is required',
          });
        }
        break;

      case 'zelle':
        if (!method.contact?.trim()) {
          errors.push({
            type: 'zelle',
            field: 'contact',
            message: 'Email or phone number is required for Zelle',
          });
        }
        break;

      case 'paypal':
        if (!method.contact?.trim()) {
          errors.push({
            type: 'paypal',
            field: 'contact',
            message: 'Email or PayPal.me URL is required',
          });
        }
        break;

      case 'cashapp':
        if (!method.cashtag?.trim()) {
          errors.push({
            type: 'cashapp',
            field: 'cashtag',
            message: 'Cash App cashtag is required',
          });
        }
        break;

      case 'card':
        if (!method.paymentUrl?.trim()) {
          errors.push({
            type: 'card',
            field: 'paymentUrl',
            message: 'Payment URL is required for card payments',
          });
        }
        break;

      // cash and wire have no required fields
    }
  }

  return errors;
}

function normalizeMethodLabel(label: string): PaymentMethodDetail['method'] {
  switch (label) {
    case 'Credit/Debit Card':
      return 'Credit Card';
    default:
      return label as PaymentMethodDetail['method'];
  }
}
