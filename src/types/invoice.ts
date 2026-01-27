export type InvoiceStatus = 
  | 'draft' 
  | 'sent' 
  | 'viewed' 
  | 'partially_paid' 
  | 'paid' 
  | 'overdue' 
  | 'cancelled';

export type PaymentMethod = 
  | 'Cash' 
  | 'Check' 
  | 'Venmo' 
  | 'Zelle' 
  | 'PayPal' 
  | 'Cash App' 
  | 'Wire Transfer' 
  | 'Credit Card'
  | 'Other';

export interface PaymentMethodDetail {
  method: PaymentMethod;
  details?: string;
}

export interface InvoiceSettings {
  id: string;
  user_id: string;
  business_name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  tax_id?: string;
  invoice_prefix: string;
  next_invoice_number: number;
  default_payment_terms: string;
  default_tax_rate?: number;
  default_currency: string;
  color_scheme: string;
  font_style: string;
  layout_style: string;
  accepted_payment_methods: PaymentMethodDetail[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  sort_order: number;
  created_at: string;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id?: string;
  client_name: string;
  client_email?: string;
  client_company?: string;
  client_address?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  currency: string;
  payment_terms?: string;
  notes?: string;
  private_notes?: string;
  accepted_payment_methods: PaymentMethodDetail[];
  gig_id?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  viewed_at?: string;
  paid_at?: string;
  line_items?: InvoiceLineItem[];
  payments?: InvoicePayment[];
  total_paid?: number;
  balance_due?: number;
}

export interface InvoiceFormData {
  client_id?: string;
  client_name: string;
  client_email?: string;
  client_company?: string;
  client_address?: string;
  invoice_date: string;
  due_date: string;
  payment_terms?: string;
  notes?: string;
  private_notes?: string;
  tax_rate?: number;
  discount_amount?: number;
  accepted_payment_methods: PaymentMethodDetail[];
  line_items: {
    description: string;
    quantity: number;
    rate: number;
  }[];
}

export interface InvoiceMetrics {
  total_outstanding: number;
  total_paid_this_month: number;
  total_paid_this_year: number;
  average_days_to_payment: number;
  overdue_amount: number;
  status_breakdown: {
    draft: number;
    sent: number;
    viewed: number;
    partially_paid: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Check',
  'Venmo',
  'Zelle',
  'PayPal',
  'Cash App',
  'Wire Transfer',
  'Credit Card',
  'Other'
];

export const PAYMENT_TERM_PRESETS = [
  { label: 'Due on Receipt', value: 'Due on Receipt', days: 0 },
  { label: 'Net 15', value: 'Net 15', days: 15 },
  { label: 'Net 30', value: 'Net 30', days: 30 },
  { label: 'Net 60', value: 'Net 60', days: 60 },
  { label: 'Custom', value: 'custom', days: null }
];

export const COLOR_SCHEMES = [
  { name: 'Blue', value: 'blue', primary: '#2563eb', secondary: '#dbeafe' },
  { name: 'Green', value: 'green', primary: '#059669', secondary: '#d1fae5' },
  { name: 'Purple', value: 'purple', primary: '#7c3aed', secondary: '#ede9fe' },
  { name: 'Gray', value: 'gray', primary: '#4b5563', secondary: '#f3f4f6' }
];

export const FONT_STYLES = [
  { name: 'Modern', value: 'modern' },
  { name: 'Classic', value: 'classic' },
  { name: 'Minimal', value: 'minimal' }
];

export const LAYOUT_STYLES = [
  { name: 'Classic', value: 'classic' },
  { name: 'Modern', value: 'modern' },
  { name: 'Minimal', value: 'minimal' }
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
];

export function getStatusColor(status: InvoiceStatus): string {
  switch (status) {
    case 'draft':
      return 'gray';
    case 'sent':
      return 'blue';
    case 'viewed':
      return 'purple';
    case 'partially_paid':
      return 'yellow';
    case 'paid':
      return 'green';
    case 'overdue':
      return 'red';
    case 'cancelled':
      return 'gray';
    default:
      return 'gray';
  }
}

export function getStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'sent':
      return 'Sent';
    case 'viewed':
      return 'Viewed';
    case 'partially_paid':
      return 'Partially Paid';
    case 'paid':
      return 'Paid';
    case 'overdue':
      return 'Overdue';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const symbol = currencyInfo?.symbol || '$';
  const safeAmount = amount ?? 0;
  return `${symbol}${safeAmount.toFixed(2)}`;
}

export function calculateDueDate(invoiceDate: string, paymentTerms: string): string {
  const date = new Date(invoiceDate);
  const preset = PAYMENT_TERM_PRESETS.find(p => p.value === paymentTerms);
  
  if (preset && preset.days !== null) {
    date.setDate(date.getDate() + preset.days);
  }
  
  return date.toISOString().split('T')[0];
}
