import { z } from 'zod';
import { MAX_REASONABLE_MILES_PER_TRIP } from './mileage';

export const payerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['Venue', 'Client', 'Platform', 'Other', 'Individual', 'Corporation']),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
  expect_1099: z.boolean().default(false),
  tax_id_type: z.enum(['ssn', 'ein']).optional(),
  tax_id_last4: z.string().length(4, 'Must be exactly 4 digits').regex(/^\d{4}$/, 'Must be 4 digits').optional(),
  tax_treatment: z.enum(['w2', 'contractor_1099', 'other']).default('contractor_1099'),
  w2_employer_name: z.string().optional(),
  w2_employer_ein_last4: z.string().length(4, 'Must be exactly 4 digits').regex(/^\d{4}$/, 'Must be 4 digits').optional(),
  payroll_provider: z.string().optional(),
  payroll_contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
});

export type PayerFormData = z.infer<typeof payerSchema>;

export const gigSchema = z.object({
  payer_id: z.string().uuid('Please select a payer'),
  date: z.string().min(1, 'Date is required'),
  title: z.string().min(1, 'Title is required'),
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
  tax_treatment: z.enum(['w2', 'contractor_1099', 'other']).optional(),
  amount_type: z.enum(['gross', 'net']).default('gross'),
  net_amount_w2: z.number().min(0, 'Must be 0 or greater').optional(),
  withholding_amount: z.number().min(0, 'Must be 0 or greater').optional(),
  start_time: z.string().optional(), // HH:MM format (24-hour)
  end_time: z.string().optional(), // HH:MM format (24-hour)
});

export type GigFormData = z.infer<typeof gigSchema>;

export const expenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: z.enum(['Meals & Entertainment', 'Travel', 'Lodging', 'Equipment/Gear', 'Supplies', 'Software/Subscriptions', 'Marketing/Promotion', 'Professional Fees', 'Education/Training', 'Rent/Studio', 'Other']),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0, 'Must be 0 or greater'),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  gig_id: z.string().optional(),
  receipt_path: z.string().optional(),
  business_use_percent: z.number().min(0).max(100).optional(),
  meals_percent_allowed: z.number().min(0).max(1).optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

export const mileageSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  purpose: z.string().trim().min(1, 'Purpose is required').max(120, 'Purpose is too long'),
  start_location: z.string().trim().min(1, 'Start location is required').max(250, 'Start location is too long'),
  end_location: z.string().trim().min(1, 'End location is required').max(250, 'End location is too long'),
  miles: z
    .number()
    .finite('Miles must be a valid number')
    .positive('Miles must be greater than 0')
    .max(MAX_REASONABLE_MILES_PER_TRIP, `Miles must be ${MAX_REASONABLE_MILES_PER_TRIP} or less`),
  notes: z.string().trim().max(1000, 'Notes are too long').optional(),
});

export type MileageFormData = z.infer<typeof mileageSchema>;
