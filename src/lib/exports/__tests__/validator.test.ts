/**
 * Unit Tests for Export Validator
 * Tests validation logic for blocking errors and warnings
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateExportData,
  getValidationSummary,
  groupIssuesByCategory,
} from '../validator';
import type { GigExportRow, ExpenseExportRow, MileageExportRow } from '../schemas';

describe('Export Validator', () => {
  const validGig: GigExportRow = {
    gig_id: '1',
    date: '2025-01-15',
    title: 'Test Gig',
    payer_name: 'Test Payer',
    payer_ein_or_ssn: '12-3456789',
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
  };

  const validExpense: ExpenseExportRow = {
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
  };

  const validMileage: MileageExportRow = {
    trip_id: '1',
    date: '2025-01-15',
    origin: 'Home',
    destination: 'Venue',
    business_miles: 50,
    purpose: 'Travel to gig',
    vehicle: 'Honda',
    standard_rate: 0.67,
    calculated_deduction: 33.5,
  };

  describe('Blocking Errors', () => {
    it('should block export when expense is missing IRS line code', () => {
      const invalidExpense: ExpenseExportRow = {
        ...validExpense,
        irs_schedule_c_line: '',
      };

      const result = validateExportData([validGig], [invalidExpense], [validMileage]);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('irs_schedule_c_line');
      expect(result.errors[0].category).toBe('expense');
    });

    it('should block export when expense has negative amount', () => {
      const invalidExpense: ExpenseExportRow = {
        ...validExpense,
        amount: -100,
      };

      const result = validateExportData([validGig], [invalidExpense], [validMileage]);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('amount');
    });

    it('should block export when expense has invalid date', () => {
      const invalidExpense: ExpenseExportRow = {
        ...validExpense,
        date: 'invalid-date',
      };

      const result = validateExportData([validGig], [invalidExpense], [validMileage]);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('date');
    });

    it('should block export when gig has negative gross amount', () => {
      const invalidGig: GigExportRow = {
        ...validGig,
        gross_amount: -1000,
      };

      const result = validateExportData([invalidGig], [validExpense], [validMileage]);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].category).toBe('gig');
    });

    it('should block export when mileage has negative miles', () => {
      const invalidMileage: MileageExportRow = {
        ...validMileage,
        business_miles: -50,
      };

      const result = validateExportData([validGig], [validExpense], [invalidMileage]);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].category).toBe('mileage');
    });
  });

  describe('Warnings', () => {
    it('should warn when gig is missing payer name', () => {
      const gigWithoutPayer: GigExportRow = {
        ...validGig,
        payer_name: '',
      };

      const result = validateExportData([gigWithoutPayer], [validExpense], [validMileage]);

      expect(result.isValid).toBe(true); // Not blocking
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].field).toBe('payer_name');
    });

    it('should warn when paid gig is missing EIN/SSN', () => {
      const gigWithoutEIN: GigExportRow = {
        ...validGig,
        payer_ein_or_ssn: null,
        paid: true,
      };

      const result = validateExportData([gigWithoutEIN], [validExpense], [validMileage]);

      expect(result.isValid).toBe(true); // Not blocking
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field === 'payer_ein_or_ssn')).toBe(true);
    });

    it('should warn when mileage is missing purpose', () => {
      const mileageWithoutPurpose: MileageExportRow = {
        ...validMileage,
        purpose: '',
      };

      const result = validateExportData([validGig], [validExpense], [mileageWithoutPurpose]);

      expect(result.isValid).toBe(true); // Not blocking
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].field).toBe('purpose');
    });

    it('should warn when mileage is missing origin or destination', () => {
      const mileageWithoutOrigin: MileageExportRow = {
        ...validMileage,
        origin: '',
      };

      const result = validateExportData([validGig], [validExpense], [mileageWithoutOrigin]);

      expect(result.isValid).toBe(true); // Not blocking
      expect(result.warnings.some(w => w.field === 'origin')).toBe(true);
    });

    it('should warn when meals expense is missing deduction percentage', () => {
      const mealsExpense: ExpenseExportRow = {
        ...validExpense,
        irs_schedule_c_line: '24b', // Meals line
        meals_percent_allowed: 0,
      };

      const result = validateExportData([validGig], [mealsExpense], [validMileage]);

      expect(result.isValid).toBe(true); // Not blocking
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Summary', () => {
    it('should return success message when all checks pass', () => {
      const result = validateExportData([validGig], [validExpense], [validMileage]);
      const summary = getValidationSummary(result);

      expect(summary).toContain('All checks passed');
      expect(summary).toContain('✅');
    });

    it('should return error message when blocking errors exist', () => {
      const invalidExpense: ExpenseExportRow = {
        ...validExpense,
        irs_schedule_c_line: '',
      };

      const result = validateExportData([validGig], [invalidExpense], [validMileage]);
      const summary = getValidationSummary(result);

      expect(summary).toContain('blocking error');
      expect(summary).toContain('❌');
    });

    it('should return warning message when only warnings exist', () => {
      const gigWithoutPayer: GigExportRow = {
        ...validGig,
        payer_name: '',
      };

      const result = validateExportData([gigWithoutPayer], [validExpense], [validMileage]);
      const summary = getValidationSummary(result);

      expect(summary).toContain('warning');
      expect(summary).toContain('⚠️');
    });
  });

  describe('Issue Grouping', () => {
    it('should group issues by category', () => {
      const invalidExpense: ExpenseExportRow = {
        ...validExpense,
        irs_schedule_c_line: '',
      };

      const invalidGig: GigExportRow = {
        ...validGig,
        gross_amount: -1000,
      };

      const result = validateExportData([invalidGig], [invalidExpense], [validMileage]);
      const grouped = groupIssuesByCategory(result.errors);

      expect(grouped['expense']).toBeDefined();
      expect(grouped['gig']).toBeDefined();
      expect(grouped['expense'].length).toBeGreaterThan(0);
      expect(grouped['gig'].length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Errors', () => {
    it('should catch multiple errors in single record', () => {
      const invalidExpense: ExpenseExportRow = {
        ...validExpense,
        irs_schedule_c_line: '',
        amount: -100,
        date: 'invalid',
      };

      const result = validateExportData([validGig], [invalidExpense], [validMileage]);

      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should catch errors across multiple records', () => {
      const invalidExpense1: ExpenseExportRow = {
        ...validExpense,
        expense_id: '1',
        irs_schedule_c_line: '',
      };

      const invalidExpense2: ExpenseExportRow = {
        ...validExpense,
        expense_id: '2',
        amount: -100,
      };

      const result = validateExportData([validGig], [invalidExpense1, invalidExpense2], [validMileage]);

      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Summary Counts', () => {
    it('should count total issues correctly', () => {
      const invalidExpense: ExpenseExportRow = {
        ...validExpense,
        irs_schedule_c_line: '',
      };

      const gigWithoutPayer: GigExportRow = {
        ...validGig,
        payer_name: '',
      };

      const result = validateExportData([gigWithoutPayer], [invalidExpense], [validMileage]);

      expect(result.summary.totalIssues).toBe(result.errors.length + result.warnings.length);
      expect(result.summary.blockingErrors).toBe(result.errors.length);
      expect(result.summary.warnings).toBe(result.warnings.length);
    });
  });
});
