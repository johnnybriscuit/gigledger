/**
 * Tax-Ready Export Schemas
 * Zod schemas for CPA-friendly CSV exports with exact IRS-compliant headers
 */

import { z } from 'zod';

// ============================================================================
// GIG EXPORT SCHEMA
// ============================================================================
export const GigExportSchema = z.object({
  gig_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  title: z.string(),
  payer_name: z.string(),
  payer_ein_or_ssn: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().length(2).optional().nullable(), // Two-letter state code
  country: z.string().default('US'),
  gross_amount: z.number().nonnegative(),
  tips: z.number().nonnegative(),
  per_diem: z.number().nonnegative(),
  fees: z.number().nonnegative(),
  other_income: z.number().nonnegative(),
  payment_method: z.string().optional().nullable(),
  invoice_url: z.string().url().optional().nullable(),
  paid: z.boolean(),
  withholding_federal: z.number().nonnegative().default(0),
  withholding_state: z.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
});

export type GigExportRow = z.infer<typeof GigExportSchema>;

export const GIGS_CSV_HEADERS = [
  'gig_id',
  'date',
  'title',
  'payer_name',
  'payer_ein_or_ssn',
  'city',
  'state',
  'country',
  'gross_amount',
  'tips',
  'per_diem',
  'fees',
  'other_income',
  'payment_method',
  'invoice_url',
  'paid',
  'withholding_federal',
  'withholding_state',
  'notes',
] as const;

// ============================================================================
// EXPENSE EXPORT SCHEMA
// ============================================================================
export const ExpenseExportSchema = z.object({
  expense_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  merchant: z.string().optional().nullable(),
  description: z.string(),
  amount: z.number().positive(), // Must be positive
  gl_category: z.string(), // GigLedger internal category
  irs_schedule_c_line: z.string(), // REQUIRED: IRS Schedule C line code
  meals_percent_allowed: z.number().min(0).max(1).default(0.5), // 0.5 = 50%
  linked_gig_id: z.string().uuid().optional().nullable(),
  receipt_url: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ExpenseExportRow = z.infer<typeof ExpenseExportSchema>;

export const EXPENSES_CSV_HEADERS = [
  'expense_id',
  'date',
  'merchant',
  'description',
  'amount',
  'gl_category',
  'irs_schedule_c_line',
  'meals_percent_allowed',
  'linked_gig_id',
  'receipt_url',
  'notes',
] as const;

// ============================================================================
// MILEAGE EXPORT SCHEMA
// ============================================================================
export const MileageExportSchema = z.object({
  trip_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  origin: z.string(),
  destination: z.string(),
  business_miles: z.number().nonnegative(),
  purpose: z.string(),
  vehicle: z.string().optional().nullable(),
  standard_rate: z.number().positive(), // IRS standard mileage rate
  calculated_deduction: z.number().nonnegative(),
});

export type MileageExportRow = z.infer<typeof MileageExportSchema>;

export const MILEAGE_CSV_HEADERS = [
  'trip_id',
  'date',
  'origin',
  'destination',
  'business_miles',
  'purpose',
  'vehicle',
  'standard_rate',
  'calculated_deduction',
] as const;

// ============================================================================
// PAYER EXPORT SCHEMA
// ============================================================================
export const PayerExportSchema = z.object({
  payer_id: z.string().uuid(),
  payer_name: z.string(),
  contact_name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().length(2).optional().nullable(),
  postal: z.string().optional().nullable(),
  country: z.string().default('US'),
  ein_or_ssn: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type PayerExportRow = z.infer<typeof PayerExportSchema>;

export const PAYERS_CSV_HEADERS = [
  'payer_id',
  'payer_name',
  'contact_name',
  'email',
  'phone',
  'address',
  'city',
  'state',
  'postal',
  'country',
  'ein_or_ssn',
  'notes',
] as const;

// ============================================================================
// SCHEDULE C SUMMARY SCHEMA
// ============================================================================
export const ScheduleCSummarySchema = z.object({
  tax_year: z.number().int().min(2020).max(2030),
  filing_status: z.enum(['single', 'married_joint', 'married_separate', 'head']),
  state_of_residence: z.string().length(2),
  standard_or_itemized: z.enum(['standard', 'itemized']),
  
  // INCOME (Part I)
  gross_receipts: z.number().nonnegative(),
  returns_and_allowances: z.number().nonnegative().default(0),
  other_income: z.number().nonnegative().default(0),
  total_income: z.number().nonnegative(),
  
  // EXPENSES (Part II)
  advertising: z.number().nonnegative().default(0),
  car_truck: z.number().nonnegative().default(0), // Mileage deduction
  commissions: z.number().nonnegative().default(0),
  contract_labor: z.number().nonnegative().default(0),
  depreciation: z.number().nonnegative().default(0),
  employee_benefit: z.number().nonnegative().default(0),
  insurance_other: z.number().nonnegative().default(0),
  interest_mortgage: z.number().nonnegative().default(0),
  interest_other: z.number().nonnegative().default(0),
  legal_professional: z.number().nonnegative().default(0),
  office_expense: z.number().nonnegative().default(0),
  rent_vehicles: z.number().nonnegative().default(0),
  rent_other: z.number().nonnegative().default(0),
  repairs_maintenance: z.number().nonnegative().default(0),
  supplies: z.number().nonnegative().default(0),
  taxes_licenses: z.number().nonnegative().default(0),
  travel: z.number().nonnegative().default(0),
  meals_allowed: z.number().nonnegative().default(0), // After 50% reduction
  utilities: z.number().nonnegative().default(0),
  wages: z.number().nonnegative().default(0),
  other_expenses_total: z.number().nonnegative().default(0),
  total_expenses: z.number().nonnegative(),
  
  // NET PROFIT
  net_profit: z.number(), // Can be negative (loss)
  
  // TAX ESTIMATES (informational only)
  se_tax_basis: z.number().nonnegative(),
  est_se_tax: z.number().nonnegative(),
  est_federal_income_tax: z.number().nonnegative(),
  est_state_income_tax: z.number().nonnegative(),
  est_total_tax: z.number().nonnegative(),
  set_aside_suggested: z.number().nonnegative(),
});

export type ScheduleCSummaryRow = z.infer<typeof ScheduleCSummarySchema>;

export const SCHEDULE_C_SUMMARY_CSV_HEADERS = [
  'tax_year',
  'filing_status',
  'state_of_residence',
  'standard_or_itemized',
  'gross_receipts',
  'returns_and_allowances',
  'other_income',
  'total_income',
  'advertising',
  'car_truck',
  'commissions',
  'contract_labor',
  'depreciation',
  'employee_benefit',
  'insurance_other',
  'interest_mortgage',
  'interest_other',
  'legal_professional',
  'office_expense',
  'rent_vehicles',
  'rent_other',
  'repairs_maintenance',
  'supplies',
  'taxes_licenses',
  'travel',
  'meals_allowed',
  'utilities',
  'wages',
  'other_expenses_total',
  'total_expenses',
  'net_profit',
  'se_tax_basis',
  'est_se_tax',
  'est_federal_income_tax',
  'est_state_income_tax',
  'est_total_tax',
  'set_aside_suggested',
] as const;

// ============================================================================
// IRS SCHEDULE C LINE MAPPING
// ============================================================================
export const IRS_SCHEDULE_C_LINE_CODES = {
  // Part II - Expenses
  ADVERTISING: '8',
  CAR_TRUCK: '9', // Use actual vehicle expenses OR standard mileage
  COMMISSIONS: '10',
  CONTRACT_LABOR: '11',
  DEPLETION: '12',
  DEPRECIATION: '13',
  EMPLOYEE_BENEFIT: '14',
  INSURANCE: '15',
  INTEREST_MORTGAGE: '16a',
  INTEREST_OTHER: '16b',
  LEGAL_PROFESSIONAL: '17',
  OFFICE_EXPENSE: '18',
  PENSION_PROFIT_SHARING: '19',
  RENT_VEHICLES: '20a',
  RENT_OTHER: '20b',
  REPAIRS_MAINTENANCE: '21',
  SUPPLIES: '22',
  TAXES_LICENSES: '23',
  TRAVEL: '24a',
  MEALS: '24b', // Subject to 50% limitation
  UTILITIES: '25',
  WAGES: '26',
  OTHER: '27a', // Other expenses (specify)
} as const;

export type IRSScheduleCLineCode = typeof IRS_SCHEDULE_C_LINE_CODES[keyof typeof IRS_SCHEDULE_C_LINE_CODES];

// ============================================================================
// GIGLEDGER CATEGORY TO IRS LINE MAPPING
// ============================================================================
export const CATEGORY_TO_IRS_LINE: Record<string, IRSScheduleCLineCode> = {
  // Equipment & Gear
  'Equipment': IRS_SCHEDULE_C_LINE_CODES.SUPPLIES,
  'Instruments': IRS_SCHEDULE_C_LINE_CODES.SUPPLIES,
  'Gear': IRS_SCHEDULE_C_LINE_CODES.SUPPLIES,
  
  // Marketing & Promotion
  'Marketing': IRS_SCHEDULE_C_LINE_CODES.ADVERTISING,
  'Advertising': IRS_SCHEDULE_C_LINE_CODES.ADVERTISING,
  'Website': IRS_SCHEDULE_C_LINE_CODES.ADVERTISING,
  
  // Professional Services
  'Legal': IRS_SCHEDULE_C_LINE_CODES.LEGAL_PROFESSIONAL,
  'Accounting': IRS_SCHEDULE_C_LINE_CODES.LEGAL_PROFESSIONAL,
  'Professional Services': IRS_SCHEDULE_C_LINE_CODES.LEGAL_PROFESSIONAL,
  
  // Travel & Meals
  'Travel': IRS_SCHEDULE_C_LINE_CODES.TRAVEL,
  'Lodging': IRS_SCHEDULE_C_LINE_CODES.TRAVEL,
  'Meals': IRS_SCHEDULE_C_LINE_CODES.MEALS,
  'Food': IRS_SCHEDULE_C_LINE_CODES.MEALS,
  
  // Office & Supplies
  'Office Supplies': IRS_SCHEDULE_C_LINE_CODES.OFFICE_EXPENSE,
  'Software': IRS_SCHEDULE_C_LINE_CODES.OFFICE_EXPENSE,
  'Subscriptions': IRS_SCHEDULE_C_LINE_CODES.OFFICE_EXPENSE,
  
  // Utilities & Communications
  'Phone': IRS_SCHEDULE_C_LINE_CODES.UTILITIES,
  'Internet': IRS_SCHEDULE_C_LINE_CODES.UTILITIES,
  'Utilities': IRS_SCHEDULE_C_LINE_CODES.UTILITIES,
  
  // Insurance
  'Insurance': IRS_SCHEDULE_C_LINE_CODES.INSURANCE,
  'Health Insurance': IRS_SCHEDULE_C_LINE_CODES.EMPLOYEE_BENEFIT,
  
  // Repairs & Maintenance
  'Repairs': IRS_SCHEDULE_C_LINE_CODES.REPAIRS_MAINTENANCE,
  'Maintenance': IRS_SCHEDULE_C_LINE_CODES.REPAIRS_MAINTENANCE,
  
  // Rent
  'Rent': IRS_SCHEDULE_C_LINE_CODES.RENT_OTHER,
  'Studio Rent': IRS_SCHEDULE_C_LINE_CODES.RENT_OTHER,
  'Vehicle Rent': IRS_SCHEDULE_C_LINE_CODES.RENT_VEHICLES,
  
  // Other
  'Other': IRS_SCHEDULE_C_LINE_CODES.OTHER,
  'Miscellaneous': IRS_SCHEDULE_C_LINE_CODES.OTHER,
};

/**
 * Get IRS Schedule C line code for a GigLedger category
 */
export function getIRSLineCode(category: string): IRSScheduleCLineCode {
  return CATEGORY_TO_IRS_LINE[category] || IRS_SCHEDULE_C_LINE_CODES.OTHER;
}

/**
 * Check if a category is meals/entertainment (subject to 50% limitation)
 */
export function isMealsCategory(category: string): boolean {
  const mealsCategories = ['Meals', 'Food', 'Entertainment'];
  return mealsCategories.includes(category);
}
