/**
 * Structured Payment Methods Configuration Types
 * 
 * This file defines the new structured payment method types that replace
 * the generic PaymentMethodDetail[] array with method-specific fields.
 */

// Payment method type enum
export type PaymentMethodType = 
  | 'cash'
  | 'check'
  | 'venmo'
  | 'zelle'
  | 'paypal'
  | 'cashapp'
  | 'wire'
  | 'card';

// Base interface for all payment methods
interface BasePaymentMethod {
  type: PaymentMethodType;
  enabled: boolean;
}

// Cash payment method
export interface CashPaymentMethod extends BasePaymentMethod {
  type: 'cash';
  instructions?: string;
}

// Check payment method
export interface CheckPaymentMethod extends BasePaymentMethod {
  type: 'check';
  payableTo: string;
  mailingAddress?: string;
  memo?: string;
}

// Venmo payment method
export interface VenmoPaymentMethod extends BasePaymentMethod {
  type: 'venmo';
  handle: string;
  note?: string;
}

// Zelle payment method
export interface ZellePaymentMethod extends BasePaymentMethod {
  type: 'zelle';
  contact: string; // email or phone
  note?: string;
}

// PayPal payment method
export interface PayPalPaymentMethod extends BasePaymentMethod {
  type: 'paypal';
  contact: string; // email or paypal.me URL
  note?: string;
}

// Cash App payment method
export interface CashAppPaymentMethod extends BasePaymentMethod {
  type: 'cashapp';
  cashtag: string;
  note?: string;
}

// Wire Transfer payment method
export interface WirePaymentMethod extends BasePaymentMethod {
  type: 'wire';
  instructions?: string;
  includeBankDetailsOnInvoice?: boolean;
  accountHolder?: string;
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  swift?: string;
  reference?: string;
}

// Credit/Debit Card payment method
export interface CardPaymentMethod extends BasePaymentMethod {
  type: 'card';
  paymentUrl: string;
  note?: string;
  acceptedCards?: string;
}

// Union type of all payment methods
export type PaymentMethodConfig = 
  | CashPaymentMethod
  | CheckPaymentMethod
  | VenmoPaymentMethod
  | ZellePaymentMethod
  | PayPalPaymentMethod
  | CashAppPaymentMethod
  | WirePaymentMethod
  | CardPaymentMethod;

// Top-level payment methods configuration
export interface PaymentMethodsConfig {
  enabled?: boolean; // Can be inferred from methods array
  methods: PaymentMethodConfig[];
}

// Helper type for method-specific field requirements
export interface PaymentMethodFieldRequirements {
  cash: { required: []; optional: ['instructions'] };
  check: { required: ['payableTo']; optional: ['mailingAddress', 'memo'] };
  venmo: { required: ['handle']; optional: ['note'] };
  zelle: { required: ['contact']; optional: ['note'] };
  paypal: { required: ['contact']; optional: ['note'] };
  cashapp: { required: ['cashtag']; optional: ['note'] };
  wire: { 
    required: []; 
    optional: ['instructions', 'includeBankDetailsOnInvoice', 'accountHolder', 'bankName', 'routingNumber', 'accountNumber', 'swift', 'reference'] 
  };
  card: { required: ['paymentUrl']; optional: ['note', 'acceptedCards'] };
}

// Display format for payment methods (used in invoice rendering and preview)
export interface PaymentMethodDisplay {
  label: string;
  details: string;
}

// Validation error type
export interface PaymentMethodValidationError {
  type: PaymentMethodType;
  field: string;
  message: string;
}
