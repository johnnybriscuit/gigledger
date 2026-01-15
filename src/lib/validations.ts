import { z } from 'zod';

export const payerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['Venue', 'Client', 'Platform', 'Other', 'Individual', 'Corporation']),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
  expect_1099: z.boolean().default(false),
  tax_id: z.string().optional().or(z.literal('')),
});

export type PayerFormData = z.infer<typeof payerSchema>;

export const gigSchema = z.object({
  payer_id: z.string().uuid('Please select a payer'),
  date: z.string().min(1, 'Date is required'),
  title: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  state_code: z.string().optional(), // 2-letter state code for map
  country_code: z.string().optional(), // 2-letter country code for map
  gross_amount: z.number().min(0, 'Must be 0 or greater'),
  tips: z.number().min(0, 'Must be 0 or greater').default(0),
  fees: z.number().min(0, 'Must be 0 or greater').default(0),
  per_diem: z.number().min(0, 'Must be 0 or greater').default(0),
  other_income: z.number().min(0, 'Must be 0 or greater').default(0),
  net_amount: z.number().min(0, 'Must be 0 or greater'),
  payment_method: z.string().optional(),
  invoice_link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  paid: z.boolean().default(false),
  taxes_withheld: z.boolean().default(false),
  notes: z.string().optional(),
});

export type GigFormData = z.infer<typeof gigSchema>;

export const expenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: z.enum(['Meals & Entertainment', 'Travel', 'Lodging', 'Equipment/Gear', 'Supplies', 'Software/Subscriptions', 'Marketing/Promotion', 'Professional Fees', 'Education/Training', 'Rent/Studio', 'Other']),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0, 'Must be 0 or greater'),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  receipt_path: z.string().optional(),
  business_use_percent: z.number().min(0).max(100).optional(),
  meals_percent_allowed: z.number().min(0).max(100).optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

export const mileageSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  start_location: z.string().min(1, 'Start location is required'),
  end_location: z.string().min(1, 'End location is required'),
  miles: z.number().min(0, 'Must be 0 or greater'),
  notes: z.string().optional(),
});

export type MileageFormData = z.infer<typeof mileageSchema>;
