/**
 * Unit Tests for Export Generator
 * Tests Schedule C calculations, CSV generation, and data transformations
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateScheduleCSummary,
  generateGigsCSV,
  generateExpensesCSV,
  generateMileageCSV,
  type ScheduleCCalculationInput,
} from '../generator';
import type { GigExportRow, ExpenseExportRow, MileageExportRow } from '../schemas';

describe('Schedule C Calculator', () => {
  const mockGigs: GigExportRow[] = [
    {
      gig_id: '1',
      date: '2025-01-15',
      title: 'Wedding Gig',
      payer_name: 'John Smith',
      payer_ein_or_ssn: null,
      city: 'Nashville',
      state: 'TN',
      country: 'US',
      gross_amount: 1000,
      tips: 200,
      per_diem: 50,
      fees: 100,
      other_income: 0,
      payment_method: 'Check',
      invoice_url: null,
      paid: true,
      withholding_federal: 0,
      withholding_state: 0,
      notes: null,
    },
    {
      gig_id: '2',
      date: '2025-02-20',
      title: 'Corporate Event',
      payer_name: 'ABC Corp',
      payer_ein_or_ssn: '12-3456789',
      city: 'Memphis',
      state: 'TN',
      country: 'US',
      gross_amount: 1500,
      tips: 0,
      per_diem: 0,
      fees: 150,
      other_income: 100,
      payment_method: 'Direct Deposit',
      invoice_url: null,
      paid: true,
      withholding_federal: 0,
      withholding_state: 0,
      notes: null,
    },
  ];

  const mockExpenses: ExpenseExportRow[] = [
    {
      expense_id: '1',
      date: '2025-01-10',
      merchant: 'Guitar Center',
      description: 'Guitar strings',
      amount: 50,
      gl_category: 'Supplies',
      irs_schedule_c_line: '22',
      meals_percent_allowed: 1,
      linked_gig_id: null,
      receipt_url: null,
      notes: null,
    },
    {
      expense_id: '2',
      date: '2025-01-15',
      merchant: 'Restaurant',
      description: 'Dinner with client',
      amount: 100,
      gl_category: 'Meals',
      irs_schedule_c_line: '24b',
      meals_percent_allowed: 0.5,
      linked_gig_id: '1',
      receipt_url: null,
      notes: null,
    },
    {
      expense_id: '3',
      date: '2025-02-01',
      merchant: 'Facebook Ads',
      description: 'Marketing campaign',
      amount: 200,
      gl_category: 'Marketing',
      irs_schedule_c_line: '8',
      meals_percent_allowed: 1,
      linked_gig_id: null,
      receipt_url: null,
      notes: null,
    },
  ];

  const mockMileage: MileageExportRow[] = [
    {
      trip_id: '1',
      date: '2025-01-15',
      origin: 'Home',
      destination: 'Wedding Venue',
      business_miles: 50,
      purpose: 'Travel to gig',
      vehicle: 'Honda Accord',
      standard_rate: 0.67,
      calculated_deduction: 33.5,
    },
    {
      trip_id: '2',
      date: '2025-02-20',
      origin: 'Home',
      destination: 'Corporate Office',
      business_miles: 30,
      purpose: 'Travel to gig',
      vehicle: 'Honda Accord',
      standard_rate: 0.67,
      calculated_deduction: 20.1,
    },
  ];

  it('should calculate gross receipts correctly', () => {
    const input: ScheduleCCalculationInput = {
      gigs: mockGigs,
      expenses: [],
      mileage: [],
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: true,
      includeFeesAsDeduction: false,
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    // Gross receipts = 1000 + 1500 + 200 (tips) + 50 (per diem) + 100 (other income) = 2850
    expect(result.gross_receipts).toBe(2850);
  });

  it('should apply 50% meals limitation correctly', () => {
    const input: ScheduleCCalculationInput = {
      gigs: [],
      expenses: mockExpenses,
      mileage: [],
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: true,
      includeFeesAsDeduction: false,
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    // Meals: $100 * 0.5 = $50 (50% limitation)
    expect(result.meals_allowed).toBe(50);
  });

  it('should calculate mileage deduction correctly', () => {
    const input: ScheduleCCalculationInput = {
      gigs: [],
      expenses: [],
      mileage: mockMileage,
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: true,
      includeFeesAsDeduction: false,
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    // Mileage: (50 + 30) * 0.67 = 53.60
    expect(result.car_truck).toBe(53.6);
  });

  it('should categorize expenses by IRS line code', () => {
    const input: ScheduleCCalculationInput = {
      gigs: [],
      expenses: mockExpenses,
      mileage: [],
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: true,
      includeFeesAsDeduction: false,
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    // Advertising (Line 8): $200
    expect(result.advertising).toBe(200);

    // Supplies (Line 22): $50
    expect(result.supplies).toBe(50);

    // Meals (Line 24b): $100 * 0.5 = $50
    expect(result.meals_allowed).toBe(50);
  });

  it('should calculate total expenses correctly', () => {
    const input: ScheduleCCalculationInput = {
      gigs: [],
      expenses: mockExpenses,
      mileage: mockMileage,
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: true,
      includeFeesAsDeduction: false,
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    // Total: $200 (advertising) + $50 (supplies) + $50 (meals after 50%) + $53.60 (mileage) = $353.60
    expect(result.total_expenses).toBe(353.6);
  });

  it('should calculate net profit correctly', () => {
    const input: ScheduleCCalculationInput = {
      gigs: mockGigs,
      expenses: mockExpenses,
      mileage: mockMileage,
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: true,
      includeFeesAsDeduction: false,
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    // Income: $2850 - $250 (fees) = $2600
    // Expenses: $353.60
    // Net profit: $2600 - $353.60 = $2246.40
    expect(result.total_income).toBe(2600);
    expect(result.total_expenses).toBe(353.6);
    expect(result.net_profit).toBe(2246.4);
  });

  it('should handle fees as deduction when enabled', () => {
    const input: ScheduleCCalculationInput = {
      gigs: mockGigs,
      expenses: [],
      mileage: [],
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: true,
      includeFeesAsDeduction: true, // Fees as deduction
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    // Income: $2850 (no fee reduction)
    // Expenses: $250 (fees as commissions)
    expect(result.total_income).toBe(2850);
    expect(result.commissions).toBe(250);
  });

  it('should exclude tips when includeTips is false', () => {
    const input: ScheduleCCalculationInput = {
      gigs: mockGigs,
      expenses: [],
      mileage: [],
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: false, // Exclude tips
      includeFeesAsDeduction: false,
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    // Gross receipts without tips: 1000 + 1500 + 50 + 100 = 2650
    expect(result.gross_receipts).toBe(2650);
  });

  it('should calculate SE tax basis correctly', () => {
    const input: ScheduleCCalculationInput = {
      gigs: mockGigs,
      expenses: mockExpenses,
      mileage: mockMileage,
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: true,
      includeFeesAsDeduction: false,
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    // SE tax basis = net profit * 0.9235
    // $2246.40 * 0.9235 = $2074.56
    expect(result.se_tax_basis).toBeCloseTo(2074.56, 2);
  });
});

describe('CSV Generators', () => {
  it('should generate gigs CSV with correct headers', () => {
    const gigs: GigExportRow[] = [
      {
        gig_id: '1',
        date: '2025-01-15',
        title: 'Test Gig',
        payer_name: 'Test Payer',
        payer_ein_or_ssn: null,
        city: 'Nashville',
        state: 'TN',
        country: 'US',
        gross_amount: 1000,
        tips: 100,
        per_diem: 50,
        fees: 50,
        other_income: 0,
        payment_method: 'Check',
        invoice_url: null,
        paid: true,
        withholding_federal: 0,
        withholding_state: 0,
        notes: null,
      },
    ];

    const csv = generateGigsCSV(gigs);

    expect(csv).toContain('gig_id,date,title,payer_name');
    expect(csv).toContain('2025-01-15');
    expect(csv).toContain('Test Gig');
    expect(csv).toContain('1000');
  });

  it('should escape CSV fields with commas', () => {
    const gigs: GigExportRow[] = [
      {
        gig_id: '1',
        date: '2025-01-15',
        title: 'Wedding, Reception',
        payer_name: 'Smith, John',
        payer_ein_or_ssn: null,
        city: 'Nashville',
        state: 'TN',
        country: 'US',
        gross_amount: 1000,
        tips: 0,
        per_diem: 0,
        fees: 0,
        other_income: 0,
        payment_method: 'Check',
        invoice_url: null,
        paid: true,
        withholding_federal: 0,
        withholding_state: 0,
        notes: null,
      },
    ];

    const csv = generateGigsCSV(gigs);

    // Fields with commas should be wrapped in quotes
    expect(csv).toContain('"Wedding, Reception"');
    expect(csv).toContain('"Smith, John"');
  });

  it('should generate expenses CSV with IRS line codes', () => {
    const expenses: ExpenseExportRow[] = [
      {
        expense_id: '1',
        date: '2025-01-10',
        merchant: 'Test Merchant',
        description: 'Test Expense',
        amount: 100,
        gl_category: 'Supplies',
        irs_schedule_c_line: '22',
        meals_percent_allowed: 1,
        linked_gig_id: null,
        receipt_url: null,
        notes: null,
      },
    ];

    const csv = generateExpensesCSV(expenses);

    expect(csv).toContain('irs_schedule_c_line');
    expect(csv).toContain('22');
    expect(csv).toContain('meals_percent_allowed');
  });

  it('should generate mileage CSV with calculated deductions', () => {
    const mileage: MileageExportRow[] = [
      {
        trip_id: '1',
        date: '2025-01-15',
        origin: 'Home',
        destination: 'Venue',
        business_miles: 50,
        purpose: 'Travel to gig',
        vehicle: 'Honda',
        standard_rate: 0.67,
        calculated_deduction: 33.5,
      },
    ];

    const csv = generateMileageCSV(mileage);

    expect(csv).toContain('business_miles');
    expect(csv).toContain('standard_rate');
    expect(csv).toContain('calculated_deduction');
    expect(csv).toContain('33.5');
  });
});

describe('Edge Cases', () => {
  it('should handle zero income', () => {
    const input: ScheduleCCalculationInput = {
      gigs: [],
      expenses: [],
      mileage: [],
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: true,
      includeFeesAsDeduction: false,
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    expect(result.gross_receipts).toBe(0);
    expect(result.total_income).toBe(0);
    expect(result.net_profit).toBe(0);
  });

  it('should handle negative net profit (loss)', () => {
    const input: ScheduleCCalculationInput = {
      gigs: [{
        gig_id: '1',
        date: '2025-01-15',
        title: 'Small Gig',
        payer_name: 'Test',
        payer_ein_or_ssn: null,
        city: 'Nashville',
        state: 'TN',
        country: 'US',
        gross_amount: 100,
        tips: 0,
        per_diem: 0,
        fees: 0,
        other_income: 0,
        payment_method: 'Check',
        invoice_url: null,
        paid: true,
        withholding_federal: 0,
        withholding_state: 0,
        notes: null,
      }],
      expenses: [{
        expense_id: '1',
        date: '2025-01-10',
        merchant: 'Test',
        description: 'Large Expense',
        amount: 500,
        gl_category: 'Supplies',
        irs_schedule_c_line: '22',
        meals_percent_allowed: 1,
        linked_gig_id: null,
        receipt_url: null,
        notes: null,
      }],
      mileage: [],
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: true,
      includeFeesAsDeduction: false,
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    // Income: $100, Expenses: $500, Net: -$400
    expect(result.net_profit).toBe(-400);
  });

  it('should round amounts to cents', () => {
    const input: ScheduleCCalculationInput = {
      gigs: [{
        gig_id: '1',
        date: '2025-01-15',
        title: 'Gig',
        payer_name: 'Test',
        payer_ein_or_ssn: null,
        city: 'Nashville',
        state: 'TN',
        country: 'US',
        gross_amount: 1000.999,
        tips: 0,
        per_diem: 0,
        fees: 0,
        other_income: 0,
        payment_method: 'Check',
        invoice_url: null,
        paid: true,
        withholding_federal: 0,
        withholding_state: 0,
        notes: null,
      }],
      expenses: [],
      mileage: [],
      taxYear: 2025,
      filingStatus: 'single',
      stateOfResidence: 'TN',
      standardOrItemized: 'standard',
      includeTips: true,
      includeFeesAsDeduction: false,
      mileageRate: 0.67,
    };

    const result = calculateScheduleCSummary(input);

    // Should round to 2 decimal places
    expect(result.gross_receipts).toBe(1001);
  });
});
