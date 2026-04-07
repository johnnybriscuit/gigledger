import { describe, expect, it } from 'vitest';
import { validateTaxExportPackage } from '../validator';
import type { TaxExportPackage } from '../taxExportPackage';

function makePackage(overrides: Partial<TaxExportPackage> = {}): TaxExportPackage {
  return {
    metadata: {
      taxYear: 2025,
      dateStart: '2025-01-01',
      dateEnd: '2025-12-31',
      createdAt: '2025-01-01T00:00:00.000Z',
      timezone: 'America/Chicago',
      basis: 'cash',
      currency: 'USD',
      rounding: { mode: 'half_away_from_zero', precision: 2 },
      schemaVersion: '2026-01-26.1',
    },
    scheduleC: {
      grossReceipts: 1000,
      returnsAllowances: 0,
      cogs: 0,
      otherIncome: 0,
      expenseTotalsByScheduleCRefNumber: {},
      otherExpensesBreakdown: [],
      netProfit: 1000,
      warnings: [],
    },
    scheduleCLineItems: [],
    incomeRows: [
      {
        id: 'gig-1',
        source: 'gig',
        receivedDate: '2025-01-10',
        payerName: 'Test Payer',
        description: 'Gig income',
        amount: 1000,
        fees: 0,
        netAmount: 1000,
        currency: 'USD',
      },
    ],
    expenseRows: [
      {
        id: 'expense-1',
        date: '2025-01-11',
        description: 'Meals',
        amount: 20,
        glCategory: 'Meals',
        scheduleCRefNumber: 294,
        deductiblePercent: 0.5,
        deductibleAmount: 10,
        currency: 'USD',
        potentialAssetReview: false,
      },
    ],
    mileageRows: [
      {
        id: 'mileage-1',
        date: '2025-01-12',
        origin: 'Venue A',
        destination: 'Venue B',
        purpose: 'Travel',
        miles: 15,
        rate: 0.7,
        deductionAmount: 10.5,
        currency: 'USD',
        isEstimate: true,
      },
    ],
    invoiceRows: [],
    subcontractorPayoutRows: [],
    receiptsManifest: [],
    payerSummaryRows: [],
    mileageSummary: {
      taxYear: 2025,
      totalBusinessMiles: 15,
      standardRateUsed: 0.7,
      mileageDeductionAmount: 10.5,
      entriesCount: 1,
      isEstimateAny: true,
      notes: 'Standard mileage rate applied.',
    },
    ...overrides,
  };
}

describe('validateTaxExportPackage', () => {
  it('validates canonical export package rows directly', () => {
    const result = validateTaxExportPackage(makePackage());

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('surfaces canonical package issues without synthetic placeholder row mapping', () => {
    const result = validateTaxExportPackage(
      makePackage({
        incomeRows: [
          {
            id: 'gig-1',
            source: 'gig',
            receivedDate: 'not-a-date',
            payerName: '',
            description: 'Broken gig',
            amount: -25,
            fees: 0,
            netAmount: -25,
            currency: 'USD',
          },
        ],
        expenseRows: [
          {
            id: 'expense-1',
            date: '2025-01-11',
            description: 'Broken expense',
            amount: 10,
            glCategory: 'Other',
            scheduleCRefNumber: undefined as any,
            deductiblePercent: 1,
            deductibleAmount: 10,
            currency: 'USD',
            potentialAssetReview: false,
          },
        ],
        mileageRows: [
          {
            id: 'mileage-1',
            date: '2025-01-12',
            origin: '',
            destination: '',
            purpose: '',
            miles: 5,
            rate: 0.7,
            deductionAmount: 3.5,
            currency: 'USD',
            isEstimate: true,
          },
        ],
      })
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(['amount', 'receivedDate', 'scheduleCRefNumber'])
    );
    expect(result.warnings.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(['payerName', 'purpose', 'origin', 'destination'])
    );
  });
});
