/**
 * Unit tests for tax withholding calculations
 */

import { calculateWithholding, type StateRate } from '../withholding';

describe('Tax Withholding Calculations', () => {
  describe('Tennessee (No State Tax)', () => {
    const tnRate: StateRate = {
      state_code: 'TN',
      effective_year: 2025,
      type: 'flat',
      flat_rate: 0,
      brackets: null,
      notes: 'Tennessee has no state income tax',
    };

    it('should calculate zero state tax for TN', () => {
      const result = calculateWithholding(
        {
          amount: 1000,
          stateCode: 'TN',
          filingStatus: 'single',
        },
        tnRate
      );

      expect(result.stateIncome).toBe(0);
      expect(result.selfEmployment).toBeGreaterThan(0);
      expect(result.federalIncome).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should calculate correct SE tax', () => {
      const result = calculateWithholding(
        {
          amount: 1000,
          stateCode: 'TN',
          filingStatus: 'single',
        },
        tnRate
      );

      // SE tax should be ~15.3% of 92.35% of income
      // 1000 * 0.9235 * 0.153 = ~141.30
      expect(result.selfEmployment).toBeCloseTo(141.30, 1);
    });
  });

  describe('Maryland (Flat Rate)', () => {
    const mdRate: StateRate = {
      state_code: 'MD',
      effective_year: 2025,
      type: 'flat',
      flat_rate: 0.0475,
      brackets: null,
      notes: 'Maryland flat rate',
    };

    it('should calculate correct state tax for MD', () => {
      const result = calculateWithholding(
        {
          amount: 1000,
          stateCode: 'MD',
          filingStatus: 'single',
        },
        mdRate
      );

      // State tax should be 4.75% of income
      expect(result.stateIncome).toBe(47.5);
      expect(result.total).toBeGreaterThan(result.stateIncome);
    });
  });

  describe('California (Progressive Brackets)', () => {
    const caRate: StateRate = {
      state_code: 'CA',
      effective_year: 2025,
      type: 'bracket',
      flat_rate: null,
      brackets: [
        { upTo: 10000, rate: 0.01 },
        { upTo: 25000, rate: 0.02 },
        { upTo: 50000, rate: 0.04 },
        { upTo: 100000, rate: 0.06 },
        { upTo: null, rate: 0.08 },
      ],
      notes: 'California progressive brackets',
    };

    it('should calculate correct state tax for income in first bracket', () => {
      const result = calculateWithholding(
        {
          amount: 5000,
          stateCode: 'CA',
          filingStatus: 'single',
        },
        caRate
      );

      // All income in first bracket: 5000 * 0.01 = 50
      expect(result.stateIncome).toBe(50);
    });

    it('should calculate correct state tax across multiple brackets', () => {
      const result = calculateWithholding(
        {
          amount: 30000,
          stateCode: 'CA',
          filingStatus: 'single',
        },
        caRate
      );

      // First $10k at 1%: 100
      // Next $15k at 2%: 300
      // Next $5k at 4%: 200
      // Total: 600
      expect(result.stateIncome).toBe(600);
    });

    it('should handle YTD income correctly', () => {
      const result = calculateWithholding(
        {
          amount: 10000,
          stateCode: 'CA',
          filingStatus: 'single',
          ytdNetIncome: 15000, // Already earned $15k this year
        },
        caRate
      );

      // YTD puts us in second bracket
      // All $10k taxed at 2%: 200
      expect(result.stateIncome).toBe(200);
    });
  });

  describe('New York (Progressive Brackets)', () => {
    const nyRate: StateRate = {
      state_code: 'NY',
      effective_year: 2025,
      type: 'bracket',
      flat_rate: null,
      brackets: [
        { upTo: 8500, rate: 0.04 },
        { upTo: 11700, rate: 0.045 },
        { upTo: 13900, rate: 0.0525 },
        { upTo: 80650, rate: 0.055 },
        { upTo: 215400, rate: 0.06 },
        { upTo: null, rate: 0.0685 },
      ],
      notes: 'New York progressive brackets',
    };

    it('should calculate correct state tax for NY', () => {
      const result = calculateWithholding(
        {
          amount: 10000,
          stateCode: 'NY',
          filingStatus: 'single',
        },
        nyRate
      );

      // First $8500 at 4%: 340
      // Next $1500 at 4.5%: 67.5
      // Total: 407.5
      expect(result.stateIncome).toBe(407.5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount', () => {
      const result = calculateWithholding(
        {
          amount: 0,
          stateCode: 'TN',
          filingStatus: 'single',
        },
        null
      );

      expect(result.total).toBe(0);
      expect(result.federalIncome).toBe(0);
      expect(result.selfEmployment).toBe(0);
      expect(result.stateIncome).toBe(0);
    });

    it('should handle null state rate', () => {
      const result = calculateWithholding(
        {
          amount: 1000,
          stateCode: 'XX',
          filingStatus: 'single',
        },
        null
      );

      expect(result.stateIncome).toBe(0);
      expect(result.total).toBeGreaterThan(0); // Should still have federal and SE tax
    });

    it('should handle different filing statuses', () => {
      const single = calculateWithholding(
        {
          amount: 1000,
          stateCode: 'TN',
          filingStatus: 'single',
        },
        null
      );

      const married = calculateWithholding(
        {
          amount: 1000,
          stateCode: 'TN',
          filingStatus: 'married',
        },
        null
      );

      // Both should have same SE tax
      expect(single.selfEmployment).toBe(married.selfEmployment);
      
      // Federal may differ based on rates (currently same in MVP)
      expect(single.federalIncome).toBe(married.federalIncome);
    });
  });

  describe('Social Security Wage Base', () => {
    it('should cap SS tax at wage base', () => {
      const tnRate: StateRate = {
        state_code: 'TN',
        effective_year: 2025,
        type: 'flat',
        flat_rate: 0,
        brackets: null,
        notes: null,
      };

      // Income over SS wage base
      const result = calculateWithholding(
        {
          amount: 50000,
          stateCode: 'TN',
          filingStatus: 'single',
          ytdNetIncome: 170000, // Already over SS cap
        },
        tnRate
      );

      // Should only pay Medicare (2.9% of 92.35%)
      // 50000 * 0.9235 * 0.029 = ~1339
      expect(result.selfEmployment).toBeCloseTo(1339, 0);
    });
  });
});
