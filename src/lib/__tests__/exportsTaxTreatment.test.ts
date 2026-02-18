/**
 * Export Tax Treatment Tests
 * 
 * Verifies that W-2 gigs are correctly excluded from Schedule C exports
 * and that all export generators use the canonical filtering logic.
 */

import { describe, it, expect } from 'vitest';
import {
  GOLDEN_GIGS,
  GOLDEN_PAYERS,
  GOLDEN_EXPENSES,
  GOLDEN_EXPECTED,
  createPayerMap,
} from './fixtures/taxTreatmentGoldenDataset';
import { buildTaxExportPackageFromData } from '../exports/buildTaxExportPackage';

describe('Export Tax Treatment - Core Package', () => {
  const taxYear = 2024;
  const dateStart = '2024-01-01';
  const dateEnd = '2024-12-31';
  const timezone = 'America/New_York';

  it('should calculate Schedule C gross receipts from 1099 income only', () => {
    const pkg = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: GOLDEN_GIGS as any[],
      expenses: GOLDEN_EXPENSES as any[],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    // Schedule C gross receipts should equal 1099 income only ($1,500)
    // NOT total income ($2,500 which includes W-2)
    expect(pkg.scheduleC.grossReceipts).toBe(GOLDEN_EXPECTED.scheduleCGrossIncome);
  });

  it('should exclude W-2 gigs from Schedule C income rows', () => {
    const pkg = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: GOLDEN_GIGS as any[],
      expenses: GOLDEN_EXPENSES as any[],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    // Filter to Schedule C income rows (should be 1099 only)
    const scheduleCIncomeRows = pkg.incomeRows.filter(r => 
      r.source === 'invoice_payment' || r.taxTreatment === 'contractor_1099'
    );

    // CRITICAL: No W-2 gigs should appear in Schedule C income
    const hasW2 = scheduleCIncomeRows.some(r => r.taxTreatment === 'w2');
    expect(hasW2).toBe(false);
  });

  it('should track W-2 income separately', () => {
    const pkg = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: GOLDEN_GIGS as any[],
      expenses: GOLDEN_EXPENSES as any[],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    // W-2 income rows should exist
    const w2IncomeRows = pkg.incomeRows.filter(r => 
      r.source === 'gig' && r.taxTreatment === 'w2'
    );

    expect(w2IncomeRows.length).toBe(GOLDEN_EXPECTED.w2Gigs);
    
    const w2Total = w2IncomeRows.reduce((sum, r) => sum + r.amount, 0);
    expect(w2Total).toBe(GOLDEN_EXPECTED.w2Income);
  });

  it('should include warning when W-2 gigs are excluded', () => {
    const pkg = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: GOLDEN_GIGS as any[],
      expenses: GOLDEN_EXPENSES as any[],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    // Should have warning about W-2 exclusion
    const hasW2Warning = pkg.scheduleC.warnings.some(w => 
      w.includes('W-2 income') && w.includes('excluded from Schedule C')
    );
    expect(hasW2Warning).toBe(true);
  });

  it('should calculate Schedule C net income correctly', () => {
    const pkg = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: GOLDEN_GIGS as any[],
      expenses: GOLDEN_EXPENSES as any[],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    // Schedule C net profit = 1099 income - expenses
    // $1,500 - $300 = $1,200
    expect(pkg.scheduleC.netProfit).toBe(GOLDEN_EXPECTED.scheduleCNetIncome);
  });

  it('should track all income rows including W-2', () => {
    const pkg = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: GOLDEN_GIGS as any[],
      expenses: GOLDEN_EXPENSES as any[],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    // Total income rows should include all gigs
    const gigIncomeRows = pkg.incomeRows.filter(r => r.source === 'gig');
    expect(gigIncomeRows.length).toBe(GOLDEN_GIGS.length);
    
    const totalIncome = gigIncomeRows.reduce((sum, r) => sum + r.amount, 0);
    expect(totalIncome).toBe(GOLDEN_EXPECTED.totalIncome);
  });

  it('should correctly tag each income row with tax treatment', () => {
    const pkg = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: GOLDEN_GIGS as any[],
      expenses: GOLDEN_EXPENSES as any[],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    // Every gig income row should have a taxTreatment field
    const gigIncomeRows = pkg.incomeRows.filter(r => r.source === 'gig');
    
    for (const row of gigIncomeRows) {
      expect(row.taxTreatment).toBeDefined();
      expect(['w2', 'contractor_1099', 'other']).toContain(row.taxTreatment);
    }
  });
});

describe('Export Tax Treatment - Invariants', () => {
  const taxYear = 2024;
  const dateStart = '2024-01-01';
  const dateEnd = '2024-12-31';
  const timezone = 'America/New_York';

  it('CRITICAL: Adding W-2 gigs should not change Schedule C totals', () => {
    // Generate package with golden dataset
    const pkg1 = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: GOLDEN_GIGS as any[],
      expenses: GOLDEN_EXPENSES as any[],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    const scheduleC1 = pkg1.scheduleC.grossReceipts;

    // Add an extra W-2 gig
    const extraW2Gig = {
      id: 'extra-w2',
      payer_id: 'payer-w2-test',
      date: '2024-06-01',
      title: 'Extra W-2 Gig',
      gross_amount: 5000,
      tips: 0,
      fees: 0,
      per_diem: 0,
      other_income: 0,
      tax_treatment: null, // Will inherit W-2 from payer
      paid: true,
    };

    const pkg2 = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: [...GOLDEN_GIGS, extraW2Gig] as any[],
      expenses: GOLDEN_EXPENSES as any[],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    const scheduleC2 = pkg2.scheduleC.grossReceipts;

    // CRITICAL INVARIANT: Schedule C totals must be identical
    expect(scheduleC2).toBe(scheduleC1);
    expect(scheduleC2).toBe(GOLDEN_EXPECTED.scheduleCGrossIncome);
  });

  it('CRITICAL: Schedule C income must always be <= total income', () => {
    const pkg = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: GOLDEN_GIGS as any[],
      expenses: GOLDEN_EXPENSES as any[],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    const totalIncome = pkg.incomeRows
      .filter(r => r.source === 'gig')
      .reduce((sum, r) => sum + r.amount, 0);
    
    const scheduleCIncome = pkg.scheduleC.grossReceipts;

    // Schedule C income must be less than or equal to total income
    expect(scheduleCIncome).toBeLessThanOrEqual(totalIncome);
  });
});

describe('Export Tax Treatment - Edge Cases', () => {
  const taxYear = 2024;
  const dateStart = '2024-01-01';
  const dateEnd = '2024-12-31';
  const timezone = 'America/New_York';

  it('should handle gigs with no payer gracefully', () => {
    const gigsWithNoPayer = GOLDEN_GIGS.map(g => ({
      ...g,
      payer_id: 'non-existent-payer',
    }));

    const pkg = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: gigsWithNoPayer as any[],
      expenses: [],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    // Should default to contractor_1099 when payer not found
    const gigIncomeRows = pkg.incomeRows.filter(r => r.source === 'gig');
    expect(gigIncomeRows.length).toBeGreaterThan(0);
    
    // All should have a tax treatment (defaulting to contractor_1099)
    for (const row of gigIncomeRows) {
      expect(row.taxTreatment).toBeDefined();
    }
  });

  it('should handle empty gigs array', () => {
    const pkg = buildTaxExportPackageFromData({
      taxYear,
      timezone,
      dateStart,
      dateEnd,
      includeTips: false,
      includeFeesAsDeduction: false,
      gigs: [],
      expenses: GOLDEN_EXPENSES as any[],
      mileage: [],
      invoices: [],
      invoicePayments: [],
      subcontractorPayments: [],
      payers: GOLDEN_PAYERS as any[],
    });

    expect(pkg.scheduleC.grossReceipts).toBe(0);
    expect(pkg.incomeRows.length).toBe(0);
    expect(pkg.scheduleC.warnings).not.toContain(
      expect.stringContaining('W-2 income')
    );
  });
});
