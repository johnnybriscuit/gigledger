import { z } from 'zod';

export const payerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['Venue', 'Client', 'Platform', 'Other', 'Individual', 'Corporation']),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
  expect_1099: z.boolean().default(false),
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
  category: z.enum(['Rent', 'Travel', 'Meals', 'Lodging', 'Supplies', 'Marketing', 'Education', 'Software', 'Fees', 'Equipment', 'Other']),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0, 'Must be 0 or greater'),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  receipt_path: z.string().optional(),
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
